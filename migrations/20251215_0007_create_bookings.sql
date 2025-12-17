create table
    if not exists public.bookings (
        id bigserial primary key,
        property_id bigint not null,
        tax_amount numeric(10, 2) default 0,
        final_amount numeric(10, 2) default 0,
        cancellation_fee numeric(10, 2) default 0,
        is_no_show boolean default false,
        channel_source varchar(100),
        booking_nights integer,
        estimated_arrival timestamptz,
        estimated_departure timestamptz,
        actual_arrival timestamptz,
        actual_departure timestamptz,
        --   estimated_price numeric(10,2),
        discount_type varchar(50),
        discount numeric(10, 2) default 0,
        booking_status varchar(50),
        booking_type varchar(50),
        booking_date date,
        adult integer default 0,
        child integer default 0,
        total_guest integer,
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        comments text,
        constraint fk_booking_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_booking_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint fk_bookings_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint chk_guest_count check (
            total_guest is null
            or total_guest >= 0
        ),
        constraint chk_nights check (
            booking_nights is null
            or booking_nights >= 0
        )
    );

create index if not exists idx_bookings_status on public.bookings (booking_status);

create index if not exists idx_bookings_booking_date on public.bookings (booking_date);

-- create index if not exists idx_bookings_channel on public.bookings (channel_source);
-- create index if not exists idx_bookings_is_active on public.bookings (is_active);
create index if not exists idx_bookings_created_by on public.bookings (created_by);