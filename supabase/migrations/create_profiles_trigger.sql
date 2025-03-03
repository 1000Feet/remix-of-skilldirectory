
-- Create a function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'user_type' = 'student' then
    insert into public.student_profiles (user_id, email)
    values (new.id, new.email);
  -- For educators, we don't create profiles automatically anymore
  -- They will be created after payment
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to call this function after user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
