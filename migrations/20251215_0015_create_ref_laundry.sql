create table
    if not exists public.ref_laundry (
        id bigserial primary key,
        property_id bigint not null,
        vendor_id bigint,
        item_name varchar(150) not null,
        rate_type varchar(50) not null,
        rate numeric(10, 2) not null default 0,
        tax_rate numeric(5, 2) default 0,
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_ref_laundry_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_ref_laundry_vendor foreign key (vendor_id) references public.ref_vendors (id) on delete set null,
        constraint fk_ref_laundry_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_ref_laundry_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint chk_ref_laundry_rate check (rate >= 0),
        constraint chk_ref_laundry_tax check (tax_rate >= 0)
    );