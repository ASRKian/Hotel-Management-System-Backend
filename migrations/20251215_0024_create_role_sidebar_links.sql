create table
    if not exists public.role_sidebar_links (
        role_id bigint not null,
        sidebar_link_id bigint not null,
        constraint pk_role_sidebar primary key (role_id, sidebar_link_id),
        constraint fk_rsl_role foreign key (role_id) references public.roles (id) on delete cascade,
        constraint fk_rsl_sidebar foreign key (sidebar_link_id) references public.sidebar_links (id) on delete cascade
    );

create index if not exists idx_rsl_role on public.role_sidebar_links (role_id);