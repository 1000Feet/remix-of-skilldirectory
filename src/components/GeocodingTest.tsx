import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { testGeocodingAPI } from '@/utils/distance';

export function GeocodingTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const runTest = async () => {
    setTesting(true);
    setResult('Testing...');
    
    try {
      const success = await testGeocodingAPI();
      setResult(success ? 'API is working! ✅' : 'API test failed ❌');
    } catch (error) {
      setResult('Error testing API ❌');
      console.error('Test error:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-2">Google Maps API Test</h3>
      <div className="flex items-center gap-4">
        <Button onClick={runTest} disabled={testing}>
          {testing ? 'Testing...' : 'Test API'}
        </Button>
        <span>{result}</span>
      </div>
    </div>
  );
}
