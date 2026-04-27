import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Trash2, Send, CheckCircle2, Mail } from 'lucide-react';

interface PotentialClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  rating: number | null;
  reviews_count: number | null;
  source_query: string | null;
  google_id: string | null;
  contacted: boolean;
  notes: string | null;
  created_at: string;
}

interface BatchProgress {
  id: string;
  status: string;
  total: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  started_at: string;
}

const PotentialClients: React.FC = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<PotentialClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterContacted, setFilterContacted] = useState<'all' | 'no' | 'yes'>('no');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [activeBatch, setActiveBatch] = useState<BatchProgress | null>(null);
  const channelRef = useRef<any>(null);

  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('potential_clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    else setClients((data ?? []) as PotentialClient[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  // Realtime: subscribe to active batch updates
  useEffect(() => {
    if (!activeBatch?.id) return;
    const ch = supabase
      .channel(`batch-${activeBatch.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'email_batches',
        filter: `id=eq.${activeBatch.id}`,
      }, (payload) => {
        setActiveBatch(payload.new as BatchProgress);
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [activeBatch?.id]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => c.category && set.add(c.category));
    return Array.from(set).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      if (filterContacted === 'no' && c.contacted) return false;
      if (filterContacted === 'yes' && !c.contacted) return false;
      return true;
    });
  }, [clients, filterCategory, filterContacted]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));
  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      filtered.forEach(c => next.delete(c.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach(c => { if (c.email) next.add(c.id); });
      setSelectedIds(next);
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      let rows: any[] = [];
      const trimmed = importText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // CSV (simple parser, comma or tab separated, header row)
        const lines = trimmed.split(/\r?\n/).filter(l => l.trim());
        const headers = lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase());
        rows = lines.slice(1).map(l => {
          const cols = l.split(/[,\t]/);
          const obj: any = {};
          headers.forEach((h, i) => obj[h] = cols[i]?.trim() ?? null);
          return obj;
        });
      }

      // Dedupe within import by email + google_id
      const seen = new Set<string>();
      const cleaned = rows
        .map(r => ({
          name: r.name || r.business_name || r.title || 'Unknown',
          email: r.email || null,
          phone: r.phone || r.phone_1 || null,
          website: r.website || r.site || null,
          category: r.category || r.type || null,
          city: r.city || null,
          state: r.state || null,
          address: r.address || r.full_address || null,
          rating: r.rating ? parseFloat(r.rating) : null,
          reviews_count: r.reviews_count ? parseInt(r.reviews_count) : (r.reviews ? parseInt(r.reviews) : null),
          source_query: r.source_query || r.query || r.search_query || null,
          google_id: r.google_id || r.place_id || null,
          notes: r.notes || null,
        }))
        .filter(r => {
          const k = `${(r.email ?? '').toLowerCase()}|${r.google_id ?? ''}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

      if (cleaned.length === 0) throw new Error('Nessuna riga valida da importare');

      // Dedupe against existing rows
      const emails = cleaned.map(r => r.email).filter(Boolean) as string[];
      const gids = cleaned.map(r => r.google_id).filter(Boolean) as string[];
      const existing = new Set<string>();
      if (emails.length) {
        const { data } = await supabase.from('potential_clients').select('email').in('email', emails);
        data?.forEach(d => d.email && existing.add(`e:${d.email.toLowerCase()}`));
      }
      if (gids.length) {
        const { data } = await supabase.from('potential_clients').select('google_id').in('google_id', gids);
        data?.forEach(d => d.google_id && existing.add(`g:${d.google_id}`));
      }
      const toInsert = cleaned.filter(r =>
        !(r.email && existing.has(`e:${r.email.toLowerCase()}`)) &&
        !(r.google_id && existing.has(`g:${r.google_id}`))
      );

      if (toInsert.length === 0) {
        toast({ title: 'Niente da importare', description: 'Tutti i contatti esistono già.' });
      } else {
        const { error } = await supabase.from('potential_clients').insert(toInsert);
        if (error) throw error;
        toast({ title: 'Importati', description: `${toInsert.length} nuovi contatti (${cleaned.length - toInsert.length} duplicati saltati).` });
      }
      setImportOpen(false);
      setImportText('');
      await fetchClients();
    } catch (e: any) {
      toast({ title: 'Errore import', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleStartCampaign = async () => {
    const ids = Array.from(selectedIds).filter(id => {
      const c = clients.find(x => x.id === id);
      return c?.email && !c.contacted;
    });
    if (ids.length === 0) {
      toast({ title: 'Nessun destinatario valido', description: 'Seleziona contatti con email e non ancora contattati.', variant: 'destructive' });
      return;
    }
    setStarting(true);
    try {
      const { data: batch, error: bErr } = await supabase
        .from('email_batches')
        .insert({ total: ids.length, prospect_ids: ids, status: 'running' })
        .select()
        .single();
      if (bErr || !batch) throw bErr ?? new Error('Failed to create batch');

      const { error: invErr } = await supabase.functions.invoke('send-campaign-batch', {
        body: { batch_id: batch.id },
      });
      if (invErr) throw invErr;

      setActiveBatch(batch as BatchProgress);
      setSelectedIds(new Set());
      toast({ title: 'Campagna avviata', description: `${ids.length} email in coda. Invio ~1 ogni 96s.` });
    } catch (e: any) {
      toast({ title: 'Errore avvio', description: e.message, variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo contatto?')) return;
    const { error } = await supabase.from('potential_clients').delete().eq('id', id);
    if (error) toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    else { setClients(clients.filter(c => c.id !== id)); }
  };

  const validSelected = Array.from(selectedIds).filter(id => {
    const c = clients.find(x => x.id === id);
    return c?.email && !c.contacted;
  }).length;

  const progressPct = activeBatch && activeBatch.total > 0
    ? Math.round(((activeBatch.sent_count + activeBatch.failed_count + activeBatch.skipped_count) / activeBatch.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {activeBatch && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Campagna in corso
              <Badge variant={activeBatch.status === 'completed' ? 'default' : 'secondary'} className="ml-auto">
                {activeBatch.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {activeBatch.sent_count} inviate · {activeBatch.failed_count} fallite · {activeBatch.skipped_count} saltate / {activeBatch.total} totali
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPct} />
            <div className="mt-2 text-xs text-muted-foreground">{progressPct}% — invio ~1 email/96s via SMTP</div>
            {activeBatch.status === 'completed' && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setActiveBatch(null)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Chiudi
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Potential Clients</CardTitle>
              <CardDescription>{filtered.length} di {clients.length} contatti · {validSelected} selezionati validi</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" /> Importa
              </Button>
              <Button onClick={handleStartCampaign} disabled={starting || validSelected === 0}>
                {starting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Avvia campagna ({validSelected})
              </Button>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <select
              className="border rounded px-2 py-1 text-sm bg-background"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">Tutte le categorie</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="border rounded px-2 py-1 text-sm bg-background"
              value={filterContacted}
              onChange={e => setFilterContacted(e.target.value as any)}
            >
              <option value="no">Non contattati</option>
              <option value="yes">Contattati</option>
              <option value="all">Tutti</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nessun contatto. Importa con il pulsante in alto.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Lingua</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const lang = c.source_query?.split(',').pop()?.trim().toUpperCase() || '—';
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(c.id)}
                            disabled={!c.email || c.contacted}
                            onCheckedChange={() => toggleOne(c.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.email ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-sm">{c.category ?? '—'}</TableCell>
                        <TableCell className="text-sm">{lang}</TableCell>
                        <TableCell>
                          {c.contacted
                            ? <Badge variant="default" className="text-xs">Contattato</Badge>
                            : <Badge variant="outline" className="text-xs">Da contattare</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importa contatti</DialogTitle>
            <DialogDescription>
              Incolla CSV (con header: name,email,phone,website,category,city,state,address,rating,reviews_count,source_query,google_id) o JSON array. Dedupe automatico su email + google_id.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            rows={12}
            placeholder='name,email,website,source_query&#10;Acme,info@acme.com,acme.com,"restaurant, IT"'
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Annulla</Button>
            <Button onClick={handleImport} disabled={importing || !importText.trim()}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Importa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PotentialClients;
