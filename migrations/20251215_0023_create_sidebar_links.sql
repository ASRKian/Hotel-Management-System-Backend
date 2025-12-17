create table
    if not exists public.sidebar_links (
        id bigserial primary key,
        link_name varchar(100) not null,
        endpoint varchar(200) not null,
        parent_id bigint,
        sort_order integer default 0,
        is_active boolean default true,
        created_on timestamptz default now (),
        constraint fk_sidebar_parent foreign key (parent_id) references public.sidebar_links (id) on delete cascade
    );

create index if not exists idx_sidebar_links_active on public.sidebar_links (is_active);    