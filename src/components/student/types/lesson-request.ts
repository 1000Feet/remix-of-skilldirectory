export interface Educator {
  id: string;
  name: string;
  email: string;
}

export interface LessonRequest {
  id: string;
  educator_id: string;
  educator_profile_id: string;
  proposed_date: string;
  status: string;
  message: string | null;
  message_from_educator: string | null;
  educator: Educator;
}
