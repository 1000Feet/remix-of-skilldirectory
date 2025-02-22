-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Make sure auth.users has the metadata column
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb;

-- Recreate student_profiles table
DROP TABLE IF EXISTS public.student_profiles;
CREATE TABLE public.student_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid UNIQUE NOT NULL,
    email text NOT NULL,
    first_name text,
    last_name text,
    avatar_url text,
    phone text,
    address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_profiles_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
        DEFERRABLE INITIALLY DEFERRED
);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamps
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can insert own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can delete own profile" ON public.student_profiles;

-- Create new policies with simplified permissions
CREATE POLICY "Enable read for authenticated users"
ON public.student_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.student_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
ON public.student_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
ON public.student_profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.student_profiles TO postgres;
GRANT ALL ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.raw_user_meta_data->>'user_type' = 'student' THEN
        INSERT INTO public.student_profiles (user_id, email)
        VALUES (NEW.id, NEW.email)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger for auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_user_id_key ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS student_profiles_email_idx ON public.student_profiles(email);
