
-- XP and gamification table
CREATE TABLE public.user_xp (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  xp_points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_study_date date,
  total_study_minutes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own xp"
ON public.user_xp FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Badges table
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_emoji text NOT NULL DEFAULT '🏆',
  description text,
  earned_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own badges"
ON public.badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges"
ON public.badges FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Study groups table
CREATE TABLE public.study_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  emoji text NOT NULL DEFAULT '📚',
  owner_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  field_of_study text,
  is_public boolean DEFAULT true,
  max_members integer DEFAULT 20,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups"
ON public.study_groups FOR SELECT
USING (is_public = true OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create groups"
ON public.study_groups FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update groups"
ON public.study_groups FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete groups"
ON public.study_groups FOR DELETE
USING (auth.uid() = owner_id);

-- Group members table
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'member',
  weekly_minutes integer NOT NULL DEFAULT 0,
  total_xp integer NOT NULL DEFAULT 0,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.study_groups
    WHERE id = _group_id AND owner_id = _user_id
  )
$$;

CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Users can join groups"
ON public.group_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave groups"
ON public.group_members FOR DELETE
USING (auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.study_groups WHERE id = group_members.group_id AND owner_id = auth.uid())
);

-- Group chat messages
CREATE TABLE public.group_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view messages"
ON public.group_messages FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can send messages"
ON public.group_messages FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_group_member(group_id, auth.uid()));

-- Weekly challenges
CREATE TABLE public.weekly_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  challenge_type text NOT NULL,
  target_value integer NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 50,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start, challenge_type)
);

ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own challenges"
ON public.weekly_challenges FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update triggers
CREATE TRIGGER update_user_xp_updated_at
BEFORE UPDATE ON public.user_xp
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create XP record function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_xp (user_id, xp_points, level, streak_days)
  VALUES (NEW.id, 0, 1, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
