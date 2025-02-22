export type UserType = 'student' | 'educator';

export interface BaseProfile {
  id: string;
  email: string;
  user_type: UserType;
}

export interface StudentProfile extends BaseProfile {
  user_type: 'student';
  id: string;
  name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface EducatorProfile extends BaseProfile {
  user_type: 'educator';
  name: string;
  description: string | null;
  image: string | null;
}

export type Profile = StudentProfile | EducatorProfile;

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
  user_metadata: {
    user_type: UserType;
  };
}
