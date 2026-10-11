alter table public.rewards
drop constraint rewards_reward_id_fkey;

alter table public.rewards
add constraint rewards_reward_id_fkey
foreign key (reward_id)
references public.reward_catalog(id)
on delete restrict;