create table
    if not exists public.laundry (
        id bigserial primary key,
        room_id bigint,
        booking_id bigint not null,
        property_id bigint not null,
        staff_id uuid,
        vendor_id bigint,
        item_type varchar(100),
        laundry_type varchar(50),
        description text,
        item_count integer default 0,
        item_rate numeric(10, 2) default 0,
        amount numeric(10, 2) default 0,
        vendor_item_rate numeric(10, 2) default 0,
        vendor_amount numeric(10, 2) default 0,
        laundry_status varchar(50),
        action varchar(50),
        status varchar(50) default 'active',
        pickup_date timestamptz,
        delivery_date timestamptz,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_laundry_room foreign key (room_id) references public.ref_rooms (id) on delete set null,
        constraint fk_laundry_booking foreign key (booking_id) references public.bookings (id) on delete cascade,
        constraint fk_laundry_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_laundry_staff foreign key (staff_id) references public.users (id) on delete set null,
        constraint fk_laundry_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_laundry_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint chk_item_count check (
            item_count is null
            or item_count >= 0
        ),
        constraint chk_amount check (
            amount is null
            or amount >= 0
        ),
        constraint chk_vendor_amount check (
            vendor_amount is null
            or vendor_amount >= 0
        )
    );