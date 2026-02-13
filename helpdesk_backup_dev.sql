--
-- PostgreSQL database dump
--

\restrict uvptorWd24iKRcKFg1ldjblI3rdhqtMEQE6lYk6A9WKT7dhODOKq0GLctingrmt

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AlertType; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."AlertType" AS ENUM (
    'NEW_TICKET',
    'ESCALATED',
    'SLA_WARNING',
    'SLA_BREACH',
    'NEW_MESSAGE',
    'TRANSFERRED'
);


ALTER TYPE public."AlertType" OWNER TO helpdesk;

--
-- Name: AssetStatus; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."AssetStatus" AS ENUM (
    'AVAILABLE',
    'RESERVED',
    'IN_USE',
    'MAINTENANCE'
);


ALTER TYPE public."AssetStatus" OWNER TO helpdesk;

--
-- Name: Direction; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."Direction" AS ENUM (
    'INCOMING',
    'OUTGOING'
);


ALTER TYPE public."Direction" OWNER TO helpdesk;

--
-- Name: EquipmentCategory; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."EquipmentCategory" AS ENUM (
    'COMPUTER',
    'PRINTER',
    'MONITOR',
    'PERIPHERAL',
    'NETWORK',
    'SOFTWARE',
    'OTHER'
);


ALTER TYPE public."EquipmentCategory" OWNER TO helpdesk;

--
-- Name: InkColor; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."InkColor" AS ENUM (
    'BLACK',
    'CYAN',
    'MAGENTA',
    'YELLOW'
);


ALTER TYPE public."InkColor" OWNER TO helpdesk;

--
-- Name: ItemCategory; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."ItemCategory" AS ENUM (
    'SUPPLY',
    'INK',
    'ASSET'
);


ALTER TYPE public."ItemCategory" OWNER TO helpdesk;

--
-- Name: MessageType; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."MessageType" AS ENUM (
    'TEXT',
    'IMAGE',
    'AUDIO',
    'DOCUMENT'
);


ALTER TYPE public."MessageType" OWNER TO helpdesk;

--
-- Name: Priority; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."Priority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."Priority" OWNER TO helpdesk;

--
-- Name: ReservationStatus; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."ReservationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'IN_USE',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."ReservationStatus" OWNER TO helpdesk;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'AGENT'
);


ALTER TYPE public."Role" OWNER TO helpdesk;

--
-- Name: StockType; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."StockType" AS ENUM (
    'TI',
    'ELECTRIC'
);


ALTER TYPE public."StockType" OWNER TO helpdesk;

--
-- Name: TechnicianLevel; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."TechnicianLevel" AS ENUM (
    'N1',
    'N2',
    'N3'
);


ALTER TYPE public."TechnicianLevel" OWNER TO helpdesk;

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'NEW',
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_CLIENT',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."TicketStatus" OWNER TO helpdesk;

--
-- Name: TicketType; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."TicketType" AS ENUM (
    'SUPPORT',
    'SERVICE_REPORT'
);


ALTER TYPE public."TicketType" OWNER TO helpdesk;

--
-- Name: UnitOfMeasure; Type: TYPE; Schema: public; Owner: helpdesk
--

CREATE TYPE public."UnitOfMeasure" AS ENUM (
    'UN',
    'M',
    'L',
    'ML',
    'CX',
    'PCT',
    'KG'
);


ALTER TYPE public."UnitOfMeasure" OWNER TO helpdesk;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO helpdesk;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.attachments (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    filename text NOT NULL,
    path text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.attachments OWNER TO helpdesk;

--
-- Name: bot_sessions; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.bot_sessions (
    id text NOT NULL,
    "phoneNumber" text NOT NULL,
    state text NOT NULL,
    data text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bot_sessions OWNER TO helpdesk;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.contacts (
    id text NOT NULL,
    jid text NOT NULL,
    "phoneNumber" text,
    name text NOT NULL,
    sector text NOT NULL,
    department text,
    ramal text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contacts OWNER TO helpdesk;

--
-- Name: faqs; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.faqs (
    id text NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    keywords text NOT NULL,
    category text,
    views integer DEFAULT 0 NOT NULL,
    helpful integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.faqs OWNER TO helpdesk;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.messages (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    content text NOT NULL,
    type public."MessageType" DEFAULT 'TEXT'::public."MessageType" NOT NULL,
    direction public."Direction" NOT NULL,
    "senderId" text,
    "waMessageId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.messages OWNER TO helpdesk;

--
-- Name: part_usages; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.part_usages (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "partId" text,
    "partName" text NOT NULL,
    quantity integer NOT NULL,
    "unitCost" numeric(10,2) NOT NULL,
    purchased boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.part_usages OWNER TO helpdesk;

--
-- Name: parts; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.parts (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    quantity integer DEFAULT 0 NOT NULL,
    "minQuantity" integer DEFAULT 5 NOT NULL,
    "unitCost" numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.parts OWNER TO helpdesk;

--
-- Name: printers; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.printers (
    id text NOT NULL,
    name text NOT NULL,
    ip text NOT NULL,
    community text DEFAULT 'public'::text NOT NULL,
    model text,
    "serialNumber" text,
    location text,
    "lastStatus" text,
    "lastTonerBlack" integer,
    "lastTonerCyan" integer,
    "lastTonerMagenta" integer,
    "lastTonerYellow" integer,
    "lastPageCount" integer,
    "lastCheckedAt" timestamp(3) without time zone,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    port integer DEFAULT 161 NOT NULL
);


ALTER TABLE public.printers OWNER TO helpdesk;

--
-- Name: purchases; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.purchases (
    id text NOT NULL,
    name text NOT NULL,
    category public."EquipmentCategory" DEFAULT 'OTHER'::public."EquipmentCategory" NOT NULL,
    "serialNumber" text,
    "assetTag" text,
    quantity integer DEFAULT 1 NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "supplierId" text,
    "supplierName" text,
    sector text NOT NULL,
    location text,
    "responsibleName" text,
    "invoiceNumber" text,
    "invoiceDate" timestamp(3) without time zone,
    "warrantyMonths" integer,
    "glpiAssetId" integer,
    "syncedToGlpi" boolean DEFAULT false NOT NULL,
    "purchaseDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.purchases OWNER TO helpdesk;

--
-- Name: queues; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.queues (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    skills text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.queues OWNER TO helpdesk;

--
-- Name: report_recipients; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.report_recipients (
    id text NOT NULL,
    name text NOT NULL,
    jid text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.report_recipients OWNER TO helpdesk;

--
-- Name: reservations; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.reservations (
    id text NOT NULL,
    "stockItemId" text NOT NULL,
    "userId" text,
    "userName" text NOT NULL,
    "userPhone" text,
    "userSector" text,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    status public."ReservationStatus" DEFAULT 'PENDING'::public."ReservationStatus" NOT NULL,
    "ticketId" text,
    notes text,
    "approvedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.reservations OWNER TO helpdesk;

--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.stock_items (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    "stockType" public."StockType" DEFAULT 'TI'::public."StockType" NOT NULL,
    category public."ItemCategory" DEFAULT 'SUPPLY'::public."ItemCategory" NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    "minQuantity" numeric(10,2) DEFAULT 5 NOT NULL,
    unit public."UnitOfMeasure" DEFAULT 'UN'::public."UnitOfMeasure" NOT NULL,
    "unitCost" numeric(10,2),
    location text,
    "printerModel" text,
    "inkColor" public."InkColor",
    "assetTag" text,
    "assetStatus" public."AssetStatus" DEFAULT 'AVAILABLE'::public."AssetStatus" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isReservable" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.stock_items OWNER TO helpdesk;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.suppliers (
    id text NOT NULL,
    name text NOT NULL,
    cnpj text,
    phone text,
    email text,
    address text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.suppliers OWNER TO helpdesk;

--
-- Name: team_messages; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.team_messages (
    id text NOT NULL,
    content text NOT NULL,
    "senderId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sector text DEFAULT 'TI'::text NOT NULL
);


ALTER TABLE public.team_messages OWNER TO helpdesk;

--
-- Name: technician_alerts; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.technician_alerts (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ticketId" text,
    "glpiId" integer,
    type public."AlertType" NOT NULL,
    message text NOT NULL,
    "sentViaWa" boolean DEFAULT false NOT NULL,
    "sentViaPush" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.technician_alerts OWNER TO helpdesk;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.tickets (
    id text NOT NULL,
    "glpiId" integer,
    title text NOT NULL,
    description text NOT NULL,
    status public."TicketStatus" DEFAULT 'NEW'::public."TicketStatus" NOT NULL,
    priority public."Priority" DEFAULT 'NORMAL'::public."Priority" NOT NULL,
    "phoneNumber" text NOT NULL,
    "customerName" text,
    sector text,
    category text,
    "assignedToId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "closedAt" timestamp(3) without time zone,
    solution text,
    "solutionType" text,
    "timeWorked" integer,
    "escalatedAt" timestamp(3) without time zone,
    "awaitingRating" boolean DEFAULT false NOT NULL,
    "ratedAt" timestamp(3) without time zone,
    rating integer,
    location text,
    type public."TicketType" DEFAULT 'SUPPORT'::public."TicketType" NOT NULL
);


ALTER TABLE public.tickets OWNER TO helpdesk;

--
-- Name: users; Type: TABLE; Schema: public; Owner: helpdesk
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."Role" DEFAULT 'AGENT'::public."Role" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "glpiGroupId" integer,
    "glpiUserId" integer,
    "phoneNumber" text,
    "receiveAlerts" boolean DEFAULT true NOT NULL,
    "technicianLevel" public."TechnicianLevel" DEFAULT 'N1'::public."TechnicianLevel" NOT NULL,
    department text,
    permissions text[] DEFAULT ARRAY[]::text[],
    sector text DEFAULT 'TI'::text NOT NULL
);


ALTER TABLE public.users OWNER TO helpdesk;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
0cec1d7b-1366-460a-975c-a1a8908465b5	034738d8fb4b28b3cc461528f5758b819c4a7835a43f832fdf391bdad0a34705	2026-02-02 15:37:25.937158+00	20260114133809_init	\N	\N	2026-02-02 15:37:25.839288+00	1
bb500f3d-3360-46d1-8158-40c65526c5c3	4b587be7b695ab505868268cb78a5d006ee3f21c9f20c10e38650165fe26dd52	2026-02-02 15:37:25.974837+00	20260114202247_add_parts_inventory	\N	\N	2026-02-02 15:37:25.938511+00	1
4c0dd380-ffd9-4d32-a8b7-5d9de68c5602	fecaa1012a35f2d96c897d25a7a7669ccb40fe95b1025d8a274f8c23de2d4c1f	2026-02-02 15:37:25.992732+00	20260115120446_add_faq	\N	\N	2026-02-02 15:37:25.976553+00	1
0384c9ba-59e6-402a-84e7-31778b431c56	b6492bfba0018de32d4d5f606bd3b9c593bff5168527c777c323ae1be6625e2c	2026-02-02 15:37:26.022831+00	20260115170553_add_technician_levels_and_alerts	\N	\N	2026-02-02 15:37:25.994+00	1
88233f9d-c204-4676-8768-a7a934550858	4676f9977b5faffece6f8cf9a3122ef9f2d1b792b02bc4539bb5149c4e8ec947	2026-02-02 15:37:26.028318+00	20260115181140_add_escalated_at	\N	\N	2026-02-02 15:37:26.024044+00	1
6fc1a774-7f5f-41bb-a99a-06882ffed8e1	a7ff82269733789582d31032bab63224744b4da784f36f6fb3f5764dff439681	2026-02-02 15:37:26.048045+00	20260118220010_add_rating_and_attachments	\N	\N	2026-02-02 15:37:26.029469+00	1
6ea0a96a-764e-48ee-9984-8aab5a98c113	ef2e1c801ce45a66b087c3ee6a01846845ac9195c3f82decf5a8df0cc8fe0867	2026-02-02 15:37:26.068602+00	20260118221720_add_contacts	\N	\N	2026-02-02 15:37:26.049227+00	1
ec86127c-fac1-4ce2-bf59-e12fa7f8c6c5	e381022af1ccd907d18f880129faab8d1011e150a782b99105633d63e32e1fc7	2026-02-02 15:37:26.088492+00	20260119123547_add_printers	\N	\N	2026-02-02 15:37:26.069822+00	1
c76388e8-6fe2-430d-b835-dd6d89c071c7	43c2fd6d05e5782ca9729596b4b1a7fc1aa1525322aec99d8b49cf71869b5729	2026-02-02 15:37:26.152414+00	20260126124836_add_report_recipients	\N	\N	2026-02-02 15:37:26.089978+00	1
8d10cf9f-0879-40b7-9635-a4eeda773082	30b3e4201ee74961a5d4d08d7dfdbad94f201929ede3f7f697a56eeb62702bd6	2026-02-02 15:37:26.214694+00	20260128232917_add_stock_and_reservations	\N	\N	2026-02-02 15:37:26.153866+00	1
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.attachments (id, "ticketId", filename, path, "mimeType", size, "createdAt") FROM stdin;
\.


--
-- Data for Name: bot_sessions; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.bot_sessions (id, "phoneNumber", state, data, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.contacts (id, jid, "phoneNumber", name, sector, department, ramal, "createdAt", "updatedAt") FROM stdin;
3e8146c5-26e0-4f4e-b133-d17c8ed4d98f	108366688944156@lid	108366688944156	Matheus	TI - Sistemas	\N	\N	2026-02-03 21:00:51.723	2026-02-03 21:00:51.723
ac7e7ace-0e4d-4acf-9a67-7fdfcc58eb8e	66812796477660@lid	66812796477660	Auto posto Correntao 2	Administrativo	\N	\N	2026-02-07 12:44:46.782	2026-02-07 12:44:46.782
746c13ee-8938-4c7a-8728-5545e5248e22	134261181050994@lid	134261181050994	Siloni	administrativo	\N	\N	2026-02-11 13:01:05.039	2026-02-11 13:01:05.039
\.


--
-- Data for Name: faqs; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.faqs (id, question, answer, keywords, category, views, helpful, active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.messages (id, "ticketId", content, type, direction, "senderId", "waMessageId", "createdAt") FROM stdin;
60dd42aa-cc60-47fe-b93d-a427a98f9eaf	f105aff5-e90d-406e-a95e-b44042cdb7d0	ola testando	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-03 15:53:10.839
16070728-d842-44a7-bf20-b212bc2e0298	f105aff5-e90d-406e-a95e-b44042cdb7d0	Testando	TEXT	INCOMING	\N	A588BC8CA2D967666C5896B5D21EFE14	2026-02-03 15:53:20.782
33755c7e-560c-4a77-bf82-85b533b37537	f105aff5-e90d-406e-a95e-b44042cdb7d0	Bom dia	TEXT	INCOMING	\N	A58DBBE3F4B8D779BAF553609525E528	2026-02-03 15:53:30.753
30249a20-6ef1-4792-915e-39d365cc52f0	f105aff5-e90d-406e-a95e-b44042cdb7d0	teste	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-03 16:06:58.076
927c39e6-08db-478b-ba73-c611ca52293c	f105aff5-e90d-406e-a95e-b44042cdb7d0	Teste	TEXT	INCOMING	\N	A5D9CFA6A1178258B603800DFAB6DD25	2026-02-03 16:07:05.084
a4fef472-fabe-4862-a55c-3b1e909fcb16	32f6c054-cb16-4f62-982f-870f9bd3af65	teste	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-03 18:13:35.374
e6da0e1b-f001-43d7-ae34-38afb028433d	ec383cc6-b7f4-4156-9253-2e851eac214c	testando	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-03 18:33:16.873
0052f0ff-23e8-46e5-a136-bb3469d69243	ec383cc6-b7f4-4156-9253-2e851eac214c	Testando	TEXT	INCOMING	\N	ACC1852A73DE63C0B283C13D741F06CF	2026-02-03 18:33:33.235
8a184453-2e32-40d1-9657-c8c848b9b15d	d2e43e4f-521c-42be-9529-527fcb4bbdb7	Ola	TEXT	INCOMING	\N	AC95B3F00573BADBDC05F91D329AB97E	2026-02-04 00:49:32.453
2cbb721e-6185-4d6b-936f-e9d0020d1d52	b5ca04c1-09e9-4a00-9244-823770c3e794	Boa tarde 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:51:55.818
29383ab4-1ab2-46a5-bd4e-6c5cb4a52f10	b5ca04c1-09e9-4a00-9244-823770c3e794	Oi	TEXT	INCOMING	\N	3AEAD21A511B87601C1A	2026-02-04 18:52:18.27
bbe8cab6-de05-4639-8cfa-596ee8257a44	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:10.668
2d7f8cdc-611a-43d1-9a4a-d3de352fc33a	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:11.927
e28ebd8d-378f-4dd1-a219-b05ddf826132	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:13.198
9c045e98-9479-49ae-9033-f1d96e8daa61	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:14.027
81e2ce49-a1e5-4d6c-af5b-044f91c8a8ee	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:15.423
25839786-d8f8-4a67-b180-6bb6fc3180df	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:16.061
33e0ba40-d26c-42ef-9a58-0fc95a2aa3ca	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:19.393
6a91e7ab-a5f7-4c59-8f93-05862f339add	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:20.089
0e13e94a-a381-43a2-a500-b1442ecc4a9a	b5ca04c1-09e9-4a00-9244-823770c3e794	Resolvido ✅	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 18:54:20.502
98bb9fd7-60ab-4aa0-9e83-792be0d94b27	b5ca04c1-09e9-4a00-9244-823770c3e794	Boa tarde 	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-04 18:56:11.255
f18c9313-f8ec-43c8-ade9-decba84b5d8c	1de87efd-790f-4f88-9008-17fa61a0d5cb	testando som	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-04 19:01:48.66
6b6becff-99b2-4fcd-86c7-bb23f498c89f	1de87efd-790f-4f88-9008-17fa61a0d5cb	eu sei o que ta ai	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-04 19:01:56.415
0df944af-26b8-48ef-a717-e36ccc087034	1de87efd-790f-4f88-9008-17fa61a0d5cb	Teatando	TEXT	INCOMING	\N	A5A3ABA770BE94BAC3586B0BC0B6B0D0	2026-02-04 19:02:03.313
d9a35fb1-cb9e-4d04-8dc8-15a664f8e330	1de87efd-790f-4f88-9008-17fa61a0d5cb	⚠️	TEXT	INCOMING	\N	A50F6C8EDACDFF30A70B46C4FAEEA31B	2026-02-04 19:02:23.629
e3f9dde7-671e-43af-9734-877e6faa9c13	1de87efd-790f-4f88-9008-17fa61a0d5cb	Boa tarde	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:03:39.393
244bb463-5262-4483-8009-f83d5dd3cf23	1de87efd-790f-4f88-9008-17fa61a0d5cb	1	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:03:47.609
198f2173-313b-4cbe-80f8-6ad8c7b848cc	1de87efd-790f-4f88-9008-17fa61a0d5cb	2	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:03:49.925
c4fad1a2-a738-4da9-ba96-8975368cc261	1de87efd-790f-4f88-9008-17fa61a0d5cb	3	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:03:52.274
985a873a-6532-4201-8631-94054344bb34	1de87efd-790f-4f88-9008-17fa61a0d5cb	Teste de conectividade	TEXT	INCOMING	\N	A5025EDF17C3EE286670FE634DF3E213	2026-02-04 19:03:53.85
97c775ac-b863-42c5-9812-a7caaa53e91d	1de87efd-790f-4f88-9008-17fa61a0d5cb	Som 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:03:57.651
a433f85b-f72f-4271-934b-a5e22db4910c	1de87efd-790f-4f88-9008-17fa61a0d5cb	Chegando normal	TEXT	INCOMING	\N	A5CA46F127A5FBBFA612714796E81828	2026-02-04 19:03:59.206
2050d7b1-3c58-4b6c-8230-21da6fe8f6f7	1de87efd-790f-4f88-9008-17fa61a0d5cb	Oi som 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:04:09.32
403e10fd-82d4-46a3-bbb2-0bda3d8d8af0	1de87efd-790f-4f88-9008-17fa61a0d5cb	Kkkkkkkkkk	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:04:15.034
a282867c-8982-457c-8047-75b1113bed62	1de87efd-790f-4f88-9008-17fa61a0d5cb	Marco	TEXT	INCOMING	\N	A5CBF138720E41DB55BAE13C5E5EA486	2026-02-04 19:04:17.606
0d85667d-789f-431b-9a97-82a078396500	1de87efd-790f-4f88-9008-17fa61a0d5cb	Agora tá normal, mas deu uma bugada na primeira 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:04:26.79
30ed4107-1a90-4a38-b87d-0f53b9bed633	1de87efd-790f-4f88-9008-17fa61a0d5cb	Sei q porra foi essa não 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:04:31.249
dd116099-9dcb-493b-86cf-61630d2b2821	1de87efd-790f-4f88-9008-17fa61a0d5cb	Deve ser o sistema de auto reparo	TEXT	INCOMING	\N	A53AE44AD1759917E4F6498252557B19	2026-02-04 19:04:44.081
b56c05bc-db56-48d7-8fb3-ca7d95f0dce2	1de87efd-790f-4f88-9008-17fa61a0d5cb	Blz, vou ficar de olho	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:04:59.625
1b6e6474-c659-4399-917f-8cfd393daad5	1de87efd-790f-4f88-9008-17fa61a0d5cb	Caso aconteça dnv eu te comunico 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:05:05.637
3eeb167d-ea96-44c8-8492-3be17cc693ff	1de87efd-790f-4f88-9008-17fa61a0d5cb	Coloquei uma API do Claude que detecta erros básicos e faz reparo automático	TEXT	INCOMING	\N	A5823289B177EDB0360F79353646C32E	2026-02-04 19:05:06.36
3804afbd-9691-4d87-af80-b22d1018292f	1de87efd-790f-4f88-9008-17fa61a0d5cb	Ah sim	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:05:16.229
f9f433b8-e199-45f9-bd59-94f08fcade3c	1de87efd-790f-4f88-9008-17fa61a0d5cb	Show	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-04 19:05:21.69
874aa214-dddb-47c5-bdc8-0a5db9a4d3f8	5421ca3f-f87e-41fb-b562-814318906833	Obrigado.	TEXT	INCOMING	\N	3EB0E8D1A16A4D5415AA34	2026-02-05 13:10:52.53
3018cb30-67f6-492a-bb37-9684b9cd1ae9	3f0edbce-4414-4693-b057-a0cd20b9b80b	Bom dia 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-05 13:48:22.508
1ec2dcb4-1643-4280-a91f-3a382b5a3c61	3f0edbce-4414-4693-b057-a0cd20b9b80b	No caso, tá com problema pra puxar relatório do movtrans	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-05 13:48:35.207
b74a8753-ac2b-4828-aae9-9475d6996d3b	6c9e2a12-44ea-43fc-ab05-0497300b46bb	Na hora 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-05 14:46:43.305
5c2c1670-6eef-4b63-82a2-0aeb9a8ead8b	5421ca3f-f87e-41fb-b562-814318906833	ola magna	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-05 15:04:15.851
2aa751f3-694a-46b1-8181-335c107c3366	5421ca3f-f87e-41fb-b562-814318906833	bom dia	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-05 15:04:18.439
c2568dd8-5576-4409-902a-2e4c91893f57	5421ca3f-f87e-41fb-b562-814318906833	Olá, bom dia	TEXT	INCOMING	\N	3EB0884BF5891C98DAAFE7	2026-02-05 15:04:40.626
1d59553c-1fa9-4ee7-9053-78807ef4a576	5421ca3f-f87e-41fb-b562-814318906833	sou desenvolvedor matheus, que esta responsavel pelo sistema, os tecnicos da area de eletrica ainda não fizeram acesso mas informei a ele via whatsapp em breve vão lhe procurar ok	TEXT	OUTGOING	5f81a952-2c88-4425-bd4d-8719fc7ed83c	\N	2026-02-05 15:05:49.627
86ff9a19-013a-4e52-9bcb-c46486d8cea2	5421ca3f-f87e-41fb-b562-814318906833	Ok. Obrigado.	TEXT	INCOMING	\N	3EB0C9D67F6377C6879D02	2026-02-05 15:06:07.852
76e6ed27-a182-4b00-b61d-c6f73f50120a	657a2ae3-b352-4e89-bbc7-c7328d795090	Não entendi 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-05 16:56:04.682
d36a6a1b-72ec-42db-8545-7133d661ae16	657a2ae3-b352-4e89-bbc7-c7328d795090	Nenhum computador tá imprimindo	TEXT	INCOMING	\N	A575C33E4D3B40B66C2071DDB43E409E	2026-02-05 16:57:01.799
9990cb5d-0c11-4ae5-b977-ec291f9ffe4c	657a2ae3-b352-4e89-bbc7-c7328d795090	Ah, devo ter desconectado o cabo de rede da impressora lá naquela pecinha branca 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-05 16:59:52.695
62899226-0ce1-4994-b2d4-8da07f1a0eed	657a2ae3-b352-4e89-bbc7-c7328d795090	Que rica de baixo de onde o Marcos fica 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-05 17:00:11.124
4866dc09-d19c-49c0-9c96-7e0e42c46702	657a2ae3-b352-4e89-bbc7-c7328d795090	Verifica se tem um cabo azul solto lá 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-05 17:00:18.051
1d1450da-4ad1-4927-af6c-f63cdb1f2808	7277e487-10a9-4910-82cc-2094622093ec	Boa tarde, me passa anydesk pfv 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-05 20:31:49.458
8110a532-03e5-4a6e-8d0e-5aa6726e96d3	7277e487-10a9-4910-82cc-2094622093ec	Ta sem internet	TEXT	INCOMING	\N	A513313CF652E8C68B5F0B01744BE9D4	2026-02-05 20:33:13.954
b2c8a642-4476-4100-9476-62ff34cc4bce	7277e487-10a9-4910-82cc-2094622093ec	Voltou	TEXT	INCOMING	\N	A57A30A44AE258EB3E3326AC4F734B22	2026-02-05 20:34:32.234
39c534dd-97c0-4fcf-be0c-2ee5d53f2fa7	45c501d2-bd09-4d00-b547-7aacefbbf562	Olá	TEXT	INCOMING	\N	3A609759810D0CC1BE10	2026-02-06 23:19:44.425
e8f1cecf-6b1d-4143-a848-e2920aa07877	45c501d2-bd09-4d00-b547-7aacefbbf562	Boa noite 	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-06 23:41:19.383
c3065193-badc-413d-a90a-108cd0b30f69	45c501d2-bd09-4d00-b547-7aacefbbf562	Boa noite	TEXT	INCOMING	\N	3A66799BBEF312B865E5	2026-02-06 23:41:46.077
4baafdd0-8cfa-44c2-a0e3-9a428e68bc4e	45c501d2-bd09-4d00-b547-7aacefbbf562	Estamos com problema na internet	TEXT	INCOMING	\N	3A73478748016003A30B	2026-02-06 23:41:59.928
0c2f0bc7-8481-434a-bca2-0221b711ae7d	07e2706d-475d-46cb-99c8-84212b12f6e5	foi solicitado uma nova peça para manutenção	TEXT	OUTGOING	5977460f-e0d8-4898-8c97-46dd1a53fbd1	\N	2026-02-07 12:44:08.495
e4d15d65-a7d3-4f65-b5c0-ddc804177c3e	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	Bom dia 	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-07 13:23:04.622
70a9e8da-5335-42f7-a691-278726dcdcb0	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	Teria a possibilidade de alguém efetuar a reinicialização do moldem da cabine ? 	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-07 13:23:25.613
67df002a-d603-4eab-8371-c893f590a124	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	Reiniciamos a o moldem	TEXT	INCOMING	\N	3A20AF73DBFAF77E5D51	2026-02-07 13:26:58.485
438d5ed4-b288-4c5a-9628-5746fd976835	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	Sem sucesso	TEXT	INCOMING	\N	3A1F727C25016C003DAF	2026-02-07 13:27:03.553
73503ba8-ee93-433c-90ed-484c8551cfeb	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	Internet continua indisponível	TEXT	INCOMING	\N	3AB2B9FF66C68AFE266B	2026-02-07 13:27:17.696
c071b157-39f2-4a3c-82b7-1015150331c4	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	Ok	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-07 13:55:25.491
74a452b3-0ea0-4058-902d-e4f9e6281f5b	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	Pagamentos via pix pendentes, assim que possivel por gentileza normalizar operação	TEXT	INCOMING	\N	3EB0846967A2FDB010E53B	2026-02-07 14:14:48.301
a32218d6-0631-4c71-976c-3333bfb4be5f	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	Desde ontem esta assim	TEXT	INCOMING	\N	3EB085F78E03196D132256	2026-02-07 14:14:59.438
fa5c0702-0864-4596-b46f-c2c5d33e44a1	a8d5518a-7849-4eae-8359-69f601737e70	Bom dia 	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 13:33:53.889
7a272257-8d04-4339-8c63-12f438acc7af	a8d5518a-7849-4eae-8359-69f601737e70	bom dia Kauã	TEXT	INCOMING	\N	3EB04686AF45342F8FD68D	2026-02-09 13:34:27.517
2d16f6f8-be6f-4866-81d3-dd971230159e	a8d5518a-7849-4eae-8359-69f601737e70	Já estou verificando, só um minuto.	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 13:37:12.161
afa37de9-6917-41e2-8592-b5d7c9cb1251	a8d5518a-7849-4eae-8359-69f601737e70	Identifiquei que a máquina estava desligada. Posso agora liberar pra você ou identificar o que houve para evitar futuros reincidentes. Como prosseguimos ?	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 13:39:04.318
9c557544-c0d3-49ca-83db-27c9a8262273	a8d5518a-7849-4eae-8359-69f601737e70	Sim	TEXT	INCOMING	\N	3A51BF9E5833F51B6970	2026-02-09 13:39:39.601
0f5b0495-7c4e-4ff7-b8f6-cde446babe89	a8d5518a-7849-4eae-8359-69f601737e70	consgui acessar	TEXT	INCOMING	\N	3EB084221C53E96C049809	2026-02-09 13:41:17.326
27f485f8-2245-4dc8-9dac-30e173da00f5	a8d5518a-7849-4eae-8359-69f601737e70	Prefere já acessar ? eu estaria analisando o motivo do desligamento para evitar que aconteça novamente.	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 13:42:03.816
5810a6ed-9f9a-4ed7-afed-abe82a21d655	a8d5518a-7849-4eae-8359-69f601737e70	Estou com uma demanda urgente	TEXT	INCOMING	\N	3A952C78F39FD29FAE15	2026-02-09 13:42:27.675
2ccfc052-5d40-4523-8d3d-168c56468526	a8d5518a-7849-4eae-8359-69f601737e70	Podemos fazer outro momento?	TEXT	INCOMING	\N	3A629392C99831605094	2026-02-09 13:42:37.471
dc26f5cf-beb7-47ab-9946-da8886fb3b36	a8d5518a-7849-4eae-8359-69f601737e70	Sem problemas. Até a próxima!	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 13:42:43.405
26d4d2a3-e18c-4337-ac82-24e5e09ee0df	a8d5518a-7849-4eae-8359-69f601737e70	Grata	TEXT	INCOMING	\N	3ACAE1DE8A5C8E37FE6E	2026-02-09 13:42:59.834
b94a5fda-1757-450f-9a0e-c7a80b02d2e8	d9f28841-e333-46b3-9866-b479f2d51af0	Bom dia 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-09 13:54:22.521
9aa385d0-3e73-4973-be32-625a7058a358	d9f28841-e333-46b3-9866-b479f2d51af0	Bom Dia. Darei início ao seu atendimento. Não ficou muito claro pra mim o(a) problema/dúvida. Poderia esclarecer melhor ?	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 13:54:43.055
8e4b7137-43eb-4ffd-a321-d9124ed7162e	d9f28841-e333-46b3-9866-b479f2d51af0	A foto que mandou não chegou aqui pra mim, mas creio que é sua máquina que está travada né?	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-09 13:55:00.366
ba0f3400-7a5a-4085-9a1a-6d0fad20d474	d9f28841-e333-46b3-9866-b479f2d51af0	Isso	TEXT	INCOMING	\N	2AFC603A567C9268C2EA	2026-02-09 13:56:09.563
1808352e-b2d7-4adc-bba3-14d1537acc7d	d9f28841-e333-46b3-9866-b479f2d51af0	Tá travado	TEXT	INCOMING	\N	2AA98E28D4E74374C22A	2026-02-09 13:56:12.48
06bc6517-abda-43a0-8858-147e4266fa58	d9f28841-e333-46b3-9866-b479f2d51af0	Blz	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-09 13:56:23.395
1311f18c-2bd1-42fc-bb4b-a7bb6eb9d7ad	d9f28841-e333-46b3-9866-b479f2d51af0	Só 1 minuto pfv 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-09 13:56:28.777
42db2e93-1cdf-49a9-a576-050a8acfdf48	d9f28841-e333-46b3-9866-b479f2d51af0	Reiniciamos a máquina, estamos esperando iniciar 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-09 13:58:50.473
ce0483a6-bf2c-436e-bd76-a614210a2f4a	d9f28841-e333-46b3-9866-b479f2d51af0	Ok	TEXT	INCOMING	\N	2AD2971FE2508B526899	2026-02-09 14:01:43.229
8dee245c-2214-4d33-b883-3c220f057354	d9f28841-e333-46b3-9866-b479f2d51af0	Computador reinicializado. Pode usar normalmente.	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 14:02:18.371
c9dd8e13-3c42-4133-8b1d-dcc9e9110b40	d9f28841-e333-46b3-9866-b479f2d51af0	Até a próxima!	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 14:02:30.906
ddbfdb95-6f33-42fe-b39d-f6dd378e1929	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Bom dia. Qual a solicitação?	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 22:19:42.754
c2eaaf45-3a77-4022-9658-e4a8b0c36d22	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Corrigindo: Boa tarde.	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 22:19:52.612
b48c6dbd-d084-447c-a898-c5c7dcfc6cb5	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	preciso responder um email mais da invalido	TEXT	INCOMING	\N	3EB0A0B057A37081C3C524	2026-02-09 22:20:36.205
8bf65e89-9b07-48a3-ba74-130aebb77ea1	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	o email ta correto, e so resposta	TEXT	INCOMING	\N	3EB07CD5C56E35813E9E6C	2026-02-09 22:21:42.383
00043b93-a007-42c4-99ce-795b6a6a107e	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Damos procedência amanhã no primeiro horário.	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-09 22:52:13.289
00b3f499-e74c-4fb5-854b-73dac339ff1d	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	bom dia	TEXT	INCOMING	\N	3EB0716B4FF9937A9C1921	2026-02-10 12:37:06.528
efb61233-20d6-46ab-92be-998142375f70	8e5c9137-92ff-4748-b873-1bb29de24aba	Bom dia 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:42:53.731
7b517aea-9609-4add-94a7-d9b0e133548e	8e5c9137-92ff-4748-b873-1bb29de24aba	Está tendo algum problema?	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:43:23.387
0f4aa02f-a607-4bb6-8dea-c27e803fae57	8e5c9137-92ff-4748-b873-1bb29de24aba	Em que posso ajudar?	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:43:37.566
f3102066-7dd6-4152-a15e-5c64c8632dab	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Bom dia 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:44:10.848
5251c1e4-175a-4ece-9211-4f55882e6dc3	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Qual seria site? 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:44:31.55
5256991d-0fa0-406a-aaa6-8624ab2c5330	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Gmail ou UOL?	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:44:40.129
6a93401b-937b-4c0c-a30b-455c850a2074	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	uol	TEXT	INCOMING	\N	3EB03CED77DC1B402A33A5	2026-02-10 12:44:57.354
0ab8dbb2-b0e0-4257-a342-3e37604143d5	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	UOL tem dessas mesmo 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:45:04.865
5c36aa25-46d7-40f4-bc0a-0f7a96c4f59c	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Já tentou hoje?	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:45:09.099
ccde161d-62df-40e4-8975-f89ff37cc66d	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	tentar de novo, mas ja ta uma semana assim	TEXT	INCOMING	\N	3EB01FEA9AC873B441AB6B	2026-02-10 12:45:40.916
040e522e-4a94-480a-825d-61e1d1848384	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Estranho 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:46:03.687
d72ac849-20d9-4e95-af4d-dc590e4617ed	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Tô descendo pra pedra norte agora, quando eu chegar vejo junto com você aí, beleza?	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 12:46:23.881
bead77a0-7a18-485f-b534-b9da8298db5c	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	ta ok	TEXT	INCOMING	\N	3EB0D275C419C3060BF912	2026-02-10 12:46:46.739
27291a82-387d-4412-9abc-0a223202b438	8e5c9137-92ff-4748-b873-1bb29de24aba	Bom.dia	TEXT	INCOMING	\N	A53A79DA051211F3005451954C124BAE	2026-02-10 12:53:32.79
b01fb364-f54d-4969-ae3b-2830c065b0b0	8e5c9137-92ff-4748-b873-1bb29de24aba	Minha conexão caiu ontem	TEXT	INCOMING	\N	A5E25260417221931DC9BBD55C6380D5	2026-02-10 12:53:39.153
df377b03-46b5-434c-a96b-e9d29ea81bc7	8e5c9137-92ff-4748-b873-1bb29de24aba	A noite	TEXT	INCOMING	\N	A5D94A8B3AF7B308585400BC3C850BF6	2026-02-10 12:53:42.644
92175c62-661b-4157-bb61-16ad44d1adb4	8e5c9137-92ff-4748-b873-1bb29de24aba	E ficou a tela assim	TEXT	INCOMING	\N	A559DF77F0D59B573330528AAABE3C1C	2026-02-10 12:53:49.418
6bae1677-c1d2-49b6-a2f9-c5a5f10f2bd0	8e5c9137-92ff-4748-b873-1bb29de24aba	Olá, bom dia. Darei seguimento ao seu atendimento. Dentro de 5 minutos sua máquina será reiniciada e voltará a normalidade.	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:17:16.474
05fc4a7b-361f-45f4-91a6-275622d5e154	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Bom dia. Darei seguimento ao seu atendimento. Me passa seu AnyDesk, por favor.	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:18:01.476
ce821848-b972-45a6-8e50-d073e78d12a8	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	1 861 822 094	TEXT	INCOMING	\N	3EB0F91A09FEFF358ECB0C	2026-02-10 13:18:40.793
0144958a-daab-4f02-b38b-6171426cce89	8e5c9137-92ff-4748-b873-1bb29de24aba	Máquina reiniciada. Pode confirmar o acesso ?	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:22:25.89
24cf8727-d2c0-4897-a953-1d404121c748	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Qual seria o e-mail ?	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:24:33.145
b447bc1f-434e-4cae-8529-f5310de1318f	8e5c9137-92ff-4748-b873-1bb29de24aba	OK	TEXT	INCOMING	\N	3EB07E62AD8C0C64F9AD9A	2026-02-10 13:24:49.362
b28ed2ff-2941-4565-9b47-8c2568c0ee97	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Longuini	TEXT	INCOMING	\N	ACFE31C88B49F071D17DC490C6328D90	2026-02-10 13:25:00.255
0eacf95d-4376-4e52-aca0-15f3916747fd	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Vou mandar o arquivo q e pra enviar	TEXT	INCOMING	\N	AC5822786BEC9A48D8D322EF3DAE0315	2026-02-10 13:26:32.165
79c6a559-2334-4321-b1ce-0affc060b5e5	8e5c9137-92ff-4748-b873-1bb29de24aba	Deu certo	TEXT	INCOMING	\N	A5BE64A5CB84A16CE56FEFE58521FE64	2026-02-10 13:27:12.242
0ab6a94d-03b2-4306-b6b2-4a70324de2e9	8e5c9137-92ff-4748-b873-1bb29de24aba	Obrigada	TEXT	INCOMING	\N	A5D4A202C24091EDA30F2A37980553CB	2026-02-10 13:27:14.272
3d38ec01-1d9c-49be-a370-ed5c39236792	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	teria que mandar só pro e-mail mesmo	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:29:15.032
bc3c6d24-94e4-4c14-b8ac-ae829f80cf3d	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	ikradvogados.ac@gmail.com	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:29:29.057
e52306a9-5dce-43ca-a55e-1b6ab96be166	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	lkradvogados.ac@gmail.com	TEXT	INCOMING	\N	AC64A3C858488A768A4E8517CDCA3166	2026-02-10 13:30:52.638
2055b7a7-8c18-439e-8858-250eed7dc438	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	a primeira letra é um L minúsculo	TEXT	INCOMING	\N	ACFDEDAFCC23DB8F2E9361012C020C1D	2026-02-10 13:30:53.031
7a0aa8b3-b1de-4546-b0ca-3c127be00322	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Não é i	TEXT	INCOMING	\N	AC3861ADF9F94BD5F78859818F6A4434	2026-02-10 13:34:27.278
706295a4-23cf-4c69-92cf-2d023252a3c2	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Ok, mas também enviei pelos contatos salvos	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:35:10.666
c14fdc70-a12c-4c77-ad2f-466b7ba1ca76	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	foi com i também	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:35:31.704
7a3fa7f0-6917-4382-8ca5-e2ddfc273cc0	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	show, só isso	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:35:34.568
22ec2a17-74e5-414e-8639-13f658df4995	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	só reenviar com essa alteração do L minúsculo	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:35:49.812
cdd5d3e0-4e9f-4100-b19b-56f7fc01c6c5	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Vai digitar algo mais ?	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:37:07.243
2ed106f6-86f7-46e6-b468-ae6701a1aad0	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Já	TEXT	INCOMING	\N	AC491A075C6EF107AFB1AE4ED7B06C52	2026-02-10 13:37:42.227
282f959b-a3d7-45c1-ba7f-14d7507e59fb	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Pronto!	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:38:11.498
096a6142-e78b-4077-acb2-070c3452837a	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Naquela forma de responder não teve jeito ?	TEXT	INCOMING	\N	AC06843E88D794C82FDD21CC1140C93C	2026-02-10 13:38:31.542
0301c5b7-47df-43ab-987d-90e81d8cc0d8	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	O uol não tava reconhecendo aqueles nomes como forma de e-mail válido :/	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:38:53.115
8f47b32d-92d9-464b-a809-20440940bba4	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Tá bom	TEXT	INCOMING	\N	AC0A827100203AF47BD2588CD63CD736	2026-02-10 13:39:04.069
68f5107c-0172-4018-b340-e0edb9dc2041	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Obrigado	TEXT	INCOMING	\N	ACAD1A0BA562A5307B1EC912349D2BC2	2026-02-10 13:39:11.83
2677897d-0929-48f3-9223-7119c5087c50	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	Até mais!	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:39:19.899
ae409588-fbed-42d8-8c5a-7f00b6b675a3	8e5c9137-92ff-4748-b873-1bb29de24aba	Até mais!	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-10 13:39:55.669
dc7ee958-b7b0-4dbe-9c58-17407548d355	4c344610-476d-47ce-ac21-3f775ae08df7	Estamos providenciando o material	TEXT	OUTGOING	b8f6ec9e-45a9-4566-96ff-ec34003657a5	\N	2026-02-10 16:29:26.156
f532247b-28fd-4a78-8b35-a1a217ebefe6	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	Boa tarde, recebemos seu chamado e já agendamos um tecnico para as 14h.	TEXT	OUTGOING	5977460f-e0d8-4898-8c97-46dd1a53fbd1	\N	2026-02-10 16:32:36.071
c1ed02bb-0459-484f-8f67-28a322715215	820ed333-b45b-4b03-8196-c70198aad605	Opa, boa tarde 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:24:42.453
0472a02d-eac0-436a-886c-908e41abec11	820ed333-b45b-4b03-8196-c70198aad605	Bo-boa tarde.	TEXT	INCOMING	\N	3EB0CBAB639BBD3BB7B9AC	2026-02-10 19:24:56.313
6d951bde-29ac-43d7-96fa-844cdda1e9c6	820ed333-b45b-4b03-8196-c70198aad605	No caso a impressora que está aí é do Jarbas	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:24:59.212
0eea1e66-d96f-4b6b-804e-b9c05959451d	820ed333-b45b-4b03-8196-c70198aad605	Tá alugada pra empresa	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:25:04.812
55265705-bc73-492c-a864-897effa69629	820ed333-b45b-4b03-8196-c70198aad605	E-entra em contato com ele.	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:25:12.186
d0851bf9-1218-4f4d-a5cc-330b6ab02cd7	820ed333-b45b-4b03-8196-c70198aad605	B-boa tarde	TEXT	INCOMING	\N	3EB03D0CA6990731DE3E0A	2026-02-10 19:25:13.9
d558b503-ae3f-4842-ade0-bfadf78211ab	820ed333-b45b-4b03-8196-c70198aad605	Deixa eu falar.	TEXT	INCOMING	\N	3EB06ED908D3E42D3EF94B	2026-02-10 19:25:18.523
52ef50c2-d430-46fb-847f-a95df6a08de5	820ed333-b45b-4b03-8196-c70198aad605	Teu pai disse que tem uma impressora nova mano	TEXT	INCOMING	\N	3EB0FBAC2BF64F28C52D32	2026-02-10 19:25:29.151
b1838e24-c25b-433b-8f3d-5815a15bc191	820ed333-b45b-4b03-8196-c70198aad605	Aqui pra nós	TEXT	INCOMING	\N	3EB09436846F357761562E	2026-02-10 19:25:31.094
7045bc75-8e67-4325-b947-eec6f5e1c9cb	820ed333-b45b-4b03-8196-c70198aad605	Ai pediu pra mim registrar o atendimento aq	TEXT	INCOMING	\N	3EB06C886FF1F1E7540B03	2026-02-10 19:25:43.09
8c318a3a-9fe3-49a9-9ad3-a07161167d86	820ed333-b45b-4b03-8196-c70198aad605	Pra trocar amanhã	TEXT	INCOMING	\N	3EB0224560768D9692E2C3	2026-02-10 19:25:49.83
bc372a27-fb45-44f5-9595-b97184bacdfd	820ed333-b45b-4b03-8196-c70198aad605	N-não, Jão.	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:26:04.939
cede4d97-fa76-444f-ae7d-ea79e6b8cfea	820ed333-b45b-4b03-8196-c70198aad605	Não sei de impressora nova não, mano 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:26:15.814
40c15eac-fcdc-4b7d-bffa-5f0cac326ea3	820ed333-b45b-4b03-8196-c70198aad605	Ele acabou de trazer ela aqui	TEXT	INCOMING	\N	3EB00FDA0283181F1DCE47	2026-02-10 19:26:28.106
1a699bfc-e9d1-4a25-beed-a7d5243b35a2	820ed333-b45b-4b03-8196-c70198aad605	E aquela da casa de vcs po	TEXT	INCOMING	\N	3EB072BDD0DE26C5B21339	2026-02-10 19:26:32.297
2c88c0c9-33ca-4c2e-a32e-34299aab2543	820ed333-b45b-4b03-8196-c70198aad605	Vai vim pra ca ele disse	TEXT	INCOMING	\N	3EB04E1D7EC7750D374918	2026-02-10 19:26:37.3
28095010-e7cf-4cb8-a953-ed3a1816a51e	820ed333-b45b-4b03-8196-c70198aad605	Ah só mano 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:27:48.044
70ad10dc-f349-4761-a2a5-705a2642c6f5	820ed333-b45b-4b03-8196-c70198aad605	A xing ling	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:27:55.007
cfc46d51-b2be-4e82-b46a-f63749c09962	820ed333-b45b-4b03-8196-c70198aad605	A xing ling	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:27:55.669
d840b403-3e01-4776-b83c-0cf56218f62d	820ed333-b45b-4b03-8196-c70198aad605	Fechou então 	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-10 19:28:17.509
342e1e86-e1c5-463f-b9db-20b1d86c6aac	820ed333-b45b-4b03-8196-c70198aad605	Opa?	TEXT	INCOMING	\N	3EB02A9F2AEF847B5F380C	2026-02-10 19:29:05.941
d91e500f-fc5e-4df4-93d8-339dbb1575b8	820ed333-b45b-4b03-8196-c70198aad605	Entendi.	TEXT	INCOMING	\N	3EB06ACA59065B157B7DA7	2026-02-10 19:29:26.704
ac9601e5-26de-4a9d-bdfd-3229e03d66b5	820ed333-b45b-4b03-8196-c70198aad605	É tu q vai instalar ela?	TEXT	INCOMING	\N	3EB0233F79FC88A1410813	2026-02-10 19:29:31.388
b1aa0556-5fe3-4a4e-8288-f03b5c1b38e7	4e27abed-5458-44f4-9afa-51455cb2da96	Boa tarde, vou levar dua solicitação aos conhecimentos do seus Jarbas para que ele possa autorizar. Antes disso preciso que vc descreva uma justificativa para que eu possa iniciar essa tratativa com ele.	TEXT	OUTGOING	5977460f-e0d8-4898-8c97-46dd1a53fbd1	\N	2026-02-10 21:43:06.344
57433fe3-182f-4148-84a8-b9dc56ad9176	4e27abed-5458-44f4-9afa-51455cb2da96	Para que possamos dar andamento na liberação de acesso, é necessário que seja apresentada uma justificativa formal, informando a necessidade do acesso completo à pasta da Engenharia. Com essa justificativa, irei encaminhar a solicitação ao Sr. Jarbas Soster para avaliação e autorização.  Fico no aguardo. Obrigado.	TEXT	OUTGOING	5977460f-e0d8-4898-8c97-46dd1a53fbd1	\N	2026-02-10 21:46:56.308
12e57999-a315-4f89-88e9-a8f4af48ecd4	4e27abed-5458-44f4-9afa-51455cb2da96	Considerando minhas atribuições como responsável pelo Contrato DNIT CT 586/2025 – Lote 03B, venho solicitar a ampliação do meu acesso às pastas do servidor da Engenharia, principalmente a pasta 2026.\nO acesso integral às informações técnicas (relatórios, medições anteriores, históricos de serviços, padrões adotados, documentos contratuais e registros operacionais) é necessário para garantir continuidade das atividades, conferência de dados, elaboração de respostas à fiscalização e segurança técnica.\nAtenciosamente, Eduarda	TEXT	INCOMING	\N	3EB098CC1D76A4BC11A54F	2026-02-10 22:00:08.683
1cffa6b3-503d-4d87-b89d-71c52107a8c3	4e27abed-5458-44f4-9afa-51455cb2da96	Prezada Eduarda,  Ciente da solicitação.  Informo que iremos providenciar a liberação de acesso às pastas do servidor da Engenharia relacionadas ao Contrato DNIT CT 586/2025 – Lote 03B, incluindo, especificamente:  Pasta Engenharia  Pasta 2026  Subpastas de relatórios técnicos  Medições e históricos de medições  Históricos de serviços executados  Documentos contratuais do CT 586/2025 – Lote 03B  Padrões, procedimentos e registros operacionais  A liberação será realizada conforme necessário para garantir a continuidade, a conferência de dados e a segurança técnica das atividades do referido contrato.	TEXT	OUTGOING	5977460f-e0d8-4898-8c97-46dd1a53fbd1	\N	2026-02-11 12:12:13.44
e16c5e2a-971e-4821-834d-6ab52f85a9f1	4e27abed-5458-44f4-9afa-51455cb2da96	Prezada Eduarda,  Informo que o usuário já se encontra devidamente liberado na pasta localizada no seguinte caminho:  \\192.168.5.188\\engenharia\\2026\\02 - OBRAS\\01 - DNIT\\02 - PE 006.2025 LTs 1 - 2 - 3A e 3B  Dessa forma, estamos procedendo com o encerramento do referido chamado.  Permanecemos à disposição para qualquer necessidade adicional.  Atenciosamente, Robson Souza	TEXT	OUTGOING	db48567c-8bf7-4d52-ab18-abbf282fbb4f	\N	2026-02-11 12:56:04.595
8ab0b255-5fa9-4c69-9596-75b1e9568fb8	2751b040-e639-46f6-8686-87b8bf741833	Bom dia, previsto para 09:30	TEXT	OUTGOING	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	\N	2026-02-11 13:39:53.388
\.


--
-- Data for Name: part_usages; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.part_usages (id, "ticketId", "partId", "partName", quantity, "unitCost", purchased, "createdAt") FROM stdin;
07a445d2-56be-4a5f-a138-1d67ce25fb8a	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	Transformador 	1	300.00	f	2026-02-10 21:56:14.986
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.parts (id, name, code, description, quantity, "minQuantity", "unitCost", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: printers; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.printers (id, name, ip, community, model, "serialNumber", location, "lastStatus", "lastTonerBlack", "lastTonerCyan", "lastTonerMagenta", "lastTonerYellow", "lastPageCount", "lastCheckedAt", active, "createdAt", "updatedAt", port) FROM stdin;
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.purchases (id, name, category, "serialNumber", "assetTag", quantity, "unitPrice", "supplierId", "supplierName", sector, location, "responsibleName", "invoiceNumber", "invoiceDate", "warrantyMonths", "glpiAssetId", "syncedToGlpi", "purchaseDate", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: queues; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.queues (id, name, description, skills, active, "createdAt") FROM stdin;
\.


--
-- Data for Name: report_recipients; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.report_recipients (id, name, jid, active, "createdAt") FROM stdin;
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.reservations (id, "stockItemId", "userId", "userName", "userPhone", "userSector", "startTime", "endTime", status, "ticketId", notes, "approvedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.stock_items (id, name, code, description, "stockType", category, quantity, "minQuantity", unit, "unitCost", location, "printerModel", "inkColor", "assetTag", "assetStatus", active, "createdAt", "updatedAt", "isReservable") FROM stdin;
db455821-c4c9-4576-a31e-f7fb187bdf21	CPU DELL I7		\N	TI	ASSET	1.00	5.00	UN	\N	Pedreira 	\N	\N	PED-003	AVAILABLE	f	2026-02-03 15:26:37.237	2026-02-03 15:51:52.936	f
7095e5bb-5c26-4fd0-893e-0c07d3fa3e8e	Teclado Letron	0165130	\N	TI	SUPPLY	10.00	5.00	UN	\N	Pedreira	\N	\N	\N	AVAILABLE	t	2026-02-03 16:59:09.834	2026-02-03 16:59:09.834	f
0927f911-80af-4d9f-b138-5b30b6cebbce	Tinta hp teste	1615515	\N	TI	INK	5.00	1.00	L	\N	Pedreira	hp	BLACK	\N	AVAILABLE	t	2026-02-03 17:02:57.246	2026-02-03 17:02:57.246	f
914a10d4-756d-4723-891a-f02dee362de5	CPU DELL i7	000123456	\N	TI	ASSET	1.00	5.00	UN	\N	Pedreira	\N	\N	PED-001	AVAILABLE	t	2026-02-03 16:40:16.422	2026-02-03 18:02:32.653	f
c7899d9a-18dd-4701-aadf-a973347bce6a	teste	434535345	\N	TI	ASSET	1.00	5.00	UN	\N	teste	\N	\N	fdhghdrt	AVAILABLE	f	2026-02-05 17:01:17.685	2026-02-05 17:50:40.502	f
5df63be6-269b-4eaf-8af0-66778e7c925a	teste	tete	\N	TI	ASSET	1.00	5.00	UN	\N	teste	\N	\N	tetessjkjkj	AVAILABLE	f	2026-02-05 17:48:48.563	2026-02-05 17:51:20.992	f
b18c339a-f0ab-45aa-acbd-498e84a99103	furadeira teste	51651655	\N	TI	ASSET	1.00	5.00	UN	\N	Pedreira	\N	\N	PED-011	AVAILABLE	f	2026-02-03 17:56:23.023	2026-02-05 17:51:23.288	t
9fc7df8d-2f0e-4b40-b26c-485bbff907d4	teste	2425125	\N	TI	ASSET	50.00	5.00	UN	\N	Pedreira	\N	\N	PED-5410	AVAILABLE	f	2026-02-09 20:29:58.083	2026-02-10 16:05:32.557	f
510ed200-da3c-41ed-bb18-cbfc71d178dd	teste	8555144	\N	TI	ASSET	1.00	5.00	UN	\N	teste	\N	\N	tsteee	AVAILABLE	f	2026-02-06 20:59:11.849	2026-02-10 16:05:34.782	f
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.suppliers (id, name, cnpj, phone, email, address, active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: team_messages; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.team_messages (id, content, "senderId", "createdAt", sector) FROM stdin;
caec5800-b13e-4c89-b33b-c8f16e473939	teste	5f81a952-2c88-4425-bd4d-8719fc7ed83c	2026-02-03 21:01:04.026	TI
ad846288-e585-4277-9131-af4408971ac1	teste	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	2026-02-04 15:05:46.739	TI
8ff3040e-1056-4806-9895-bf02fcba9422	testando som	5f81a952-2c88-4425-bd4d-8719fc7ed83c	2026-02-04 19:19:08.308	TI
\.


--
-- Data for Name: technician_alerts; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.technician_alerts (id, "userId", "ticketId", "glpiId", type, message, "sentViaWa", "sentViaPush", "readAt", "createdAt") FROM stdin;
c0a82742-3000-42af-82e0-dd312e34f4d8	982d13c3-acf4-482d-96ed-246ad343be5d	5421ca3f-f87e-41fb-b562-814318906833	12	NEW_TICKET	Novo chamado GLPI #12: [Elétrica - Manutenção Geral] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Elétrica - Manutenção Geral	f	t	\N	2026-02-05 13:10:42.272
77d9c1d2-a0b2-4b54-9e84-7afdcb4a7e7e	982d13c3-acf4-482d-96ed-246ad343be5d	3f0edbce-4414-4693-b057-a0cd20b9b80b	\N	NEW_TICKET	Novo chamado (Bot): [TI - Sistemas] rayane - puxar relatorio\nCliente: rayane\nSetor: TI - Sistemas	f	t	\N	2026-02-05 13:45:59.058
e397c60a-ce5d-4554-ba52-d22202a6fe8f	ae36293d-5338-4197-9e47-36eb81daa55a	5421ca3f-f87e-41fb-b562-814318906833	12	NEW_TICKET	Novo chamado GLPI #12: [Elétrica - Manutenção Geral] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Elétrica - Manutenção Geral	t	t	\N	2026-02-05 13:10:42.286
e8407bad-ec3e-453c-92fc-f45e658c6275	5f81a952-2c88-4425-bd4d-8719fc7ed83c	d2e43e4f-521c-42be-9529-527fcb4bbdb7	9	NEW_TICKET	Novo chamado GLPI #9: [Elétrica - Iluminação] Matheus - Sem luz\nCliente: Matheus\nSetor: Elétrica - Iluminação	t	t	\N	2026-02-04 00:26:49.303
84f45241-ee84-4635-bd80-c6720e9a3f6c	982d13c3-acf4-482d-96ed-246ad343be5d	b5ca04c1-09e9-4a00-9244-823770c3e794	10	NEW_TICKET	Novo chamado GLPI #10: Falar com Técnico\nCliente: Victor Moreira\nSetor: Engenharia	f	t	\N	2026-02-04 18:50:39.802
359fe074-2989-40c7-90bb-3baf714a20d7	ae36293d-5338-4197-9e47-36eb81daa55a	b5ca04c1-09e9-4a00-9244-823770c3e794	10	NEW_TICKET	Novo chamado GLPI #10: Falar com Técnico\nCliente: Victor Moreira\nSetor: Engenharia	t	t	\N	2026-02-04 18:50:39.815
da62e51d-ae05-4b92-af2a-f846a4107cc4	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	b5ca04c1-09e9-4a00-9244-823770c3e794	10	NEW_TICKET	Novo chamado GLPI #10: Falar com Técnico\nCliente: Victor Moreira\nSetor: Engenharia	t	t	\N	2026-02-04 18:50:39.825
d4b84f06-83e4-40c9-9240-b1b26e9320ad	982d13c3-acf4-482d-96ed-246ad343be5d	1de87efd-790f-4f88-9008-17fa61a0d5cb	11	NEW_TICKET	Novo chamado GLPI #11: [TI - Infraestrutura] Magheus - Teste\nCliente: Magheus\nSetor: TI - Infraestrutura	f	t	\N	2026-02-04 19:01:13.661
13b137d0-4f2f-452d-b7ca-383276327693	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	5421ca3f-f87e-41fb-b562-814318906833	12	NEW_TICKET	Novo chamado GLPI #12: [Elétrica - Manutenção Geral] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Elétrica - Manutenção Geral	t	t	\N	2026-02-05 13:10:42.296
47b3e563-7d4f-4c26-8387-5fd108c59681	ae36293d-5338-4197-9e47-36eb81daa55a	1de87efd-790f-4f88-9008-17fa61a0d5cb	11	NEW_TICKET	Novo chamado GLPI #11: [TI - Infraestrutura] Magheus - Teste\nCliente: Magheus\nSetor: TI - Infraestrutura	t	t	\N	2026-02-04 19:01:13.678
00249e94-e137-4bd9-84aa-cdf66fc95801	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	1de87efd-790f-4f88-9008-17fa61a0d5cb	11	NEW_TICKET	Novo chamado GLPI #11: [TI - Infraestrutura] Magheus - Teste\nCliente: Magheus\nSetor: TI - Infraestrutura	t	t	\N	2026-02-04 19:01:13.689
48e6b7c4-40df-4bf6-9fd3-109bcdb6897e	ae36293d-5338-4197-9e47-36eb81daa55a	6c9e2a12-44ea-43fc-ab05-0497300b46bb	14	NEW_TICKET	Novo chamado GLPI #14: [TI - Hardware] INGRID - CONECTAR INTERNET E LIGAR O CO...\nCliente: INGRID\nSetor: TI - Hardware	t	t	\N	2026-02-05 14:37:00.7
0569d653-ce13-4595-9cdd-6bd35eaf69fd	db48567c-8bf7-4d52-ab18-abbf282fbb4f	1de87efd-790f-4f88-9008-17fa61a0d5cb	11	NEW_TICKET	Novo chamado GLPI #11: [TI - Infraestrutura] Magheus - Teste\nCliente: Magheus\nSetor: TI - Infraestrutura	t	t	\N	2026-02-04 19:01:13.699
af24ea21-fead-492c-8f7e-5126e8672080	db48567c-8bf7-4d52-ab18-abbf282fbb4f	5421ca3f-f87e-41fb-b562-814318906833	12	NEW_TICKET	Novo chamado GLPI #12: [Elétrica - Manutenção Geral] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Elétrica - Manutenção Geral	t	t	\N	2026-02-05 13:10:42.306
934fc3f4-a68b-43bf-bf94-0590a5dc1626	5977460f-e0d8-4898-8c97-46dd1a53fbd1	5421ca3f-f87e-41fb-b562-814318906833	12	NEW_TICKET	Novo chamado GLPI #12: [Elétrica - Manutenção Geral] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Elétrica - Manutenção Geral	f	t	\N	2026-02-05 13:10:42.314
dd56589c-cbe3-49a3-9e82-f4a973c3a4fb	ae36293d-5338-4197-9e47-36eb81daa55a	3f0edbce-4414-4693-b057-a0cd20b9b80b	\N	NEW_TICKET	Novo chamado (Bot): [TI - Sistemas] rayane - puxar relatorio\nCliente: rayane\nSetor: TI - Sistemas	t	t	\N	2026-02-05 13:45:59.065
f7dd4680-54c8-4fd3-95c1-55b53efe36b9	db48567c-8bf7-4d52-ab18-abbf282fbb4f	3f0edbce-4414-4693-b057-a0cd20b9b80b	\N	NEW_TICKET	Novo chamado (Bot): [TI - Sistemas] rayane - puxar relatorio\nCliente: rayane\nSetor: TI - Sistemas	t	t	\N	2026-02-05 13:45:59.044
b4869518-77eb-4552-8593-c42cc35e8e2e	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	6c9e2a12-44ea-43fc-ab05-0497300b46bb	14	NEW_TICKET	Novo chamado GLPI #14: [TI - Hardware] INGRID - CONECTAR INTERNET E LIGAR O CO...\nCliente: INGRID\nSetor: TI - Hardware	t	t	\N	2026-02-05 14:37:00.677
71f6717d-ac79-4276-ae6e-1b79e4c1a026	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	3f0edbce-4414-4693-b057-a0cd20b9b80b	\N	NEW_TICKET	Novo chamado (Bot): [TI - Sistemas] rayane - puxar relatorio\nCliente: rayane\nSetor: TI - Sistemas	t	t	\N	2026-02-05 13:45:59.076
e9fce866-eb69-43d6-8c89-95d8daa29a2f	5977460f-e0d8-4898-8c97-46dd1a53fbd1	3f0edbce-4414-4693-b057-a0cd20b9b80b	\N	NEW_TICKET	Novo chamado (Bot): [TI - Sistemas] rayane - puxar relatorio\nCliente: rayane\nSetor: TI - Sistemas	f	t	\N	2026-02-05 13:45:59.087
80a604c2-c37d-46d0-b800-1c1ff2fb856d	db48567c-8bf7-4d52-ab18-abbf282fbb4f	6c9e2a12-44ea-43fc-ab05-0497300b46bb	14	NEW_TICKET	Novo chamado GLPI #14: [TI - Hardware] INGRID - CONECTAR INTERNET E LIGAR O CO...\nCliente: INGRID\nSetor: TI - Hardware	t	t	\N	2026-02-05 14:37:00.657
d6b3ad01-6ffc-41bd-9fd5-35714f50224c	982d13c3-acf4-482d-96ed-246ad343be5d	6c9e2a12-44ea-43fc-ab05-0497300b46bb	14	NEW_TICKET	Novo chamado GLPI #14: [TI - Hardware] INGRID - CONECTAR INTERNET E LIGAR O CO...\nCliente: INGRID\nSetor: TI - Hardware	f	t	\N	2026-02-05 14:37:00.691
b5100d9d-5988-42da-8666-6074e7f46b39	982d13c3-acf4-482d-96ed-246ad343be5d	944da2c8-af49-409e-8c7f-107064edfa1a	15	NEW_TICKET	Novo chamado GLPI #15: [Elétrica - Iluminação] Matheus - Sem iluminação\nCliente: Matheus\nSetor: Elétrica - Iluminação	f	t	\N	2026-02-05 16:21:29.344
693ded47-80d2-4409-83c9-0e7d59063373	5977460f-e0d8-4898-8c97-46dd1a53fbd1	6c9e2a12-44ea-43fc-ab05-0497300b46bb	14	NEW_TICKET	Novo chamado GLPI #14: [TI - Hardware] INGRID - CONECTAR INTERNET E LIGAR O CO...\nCliente: INGRID\nSetor: TI - Hardware	f	t	\N	2026-02-05 14:37:00.712
cf16f96c-2c57-43de-bc1f-76b7027b0868	db48567c-8bf7-4d52-ab18-abbf282fbb4f	944da2c8-af49-409e-8c7f-107064edfa1a	15	NEW_TICKET	Novo chamado GLPI #15: [Elétrica - Iluminação] Matheus - Sem iluminação\nCliente: Matheus\nSetor: Elétrica - Iluminação	t	t	\N	2026-02-05 16:21:29.301
3bc4be5d-89a9-41df-9dc1-8e0586150e32	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	944da2c8-af49-409e-8c7f-107064edfa1a	15	NEW_TICKET	Novo chamado GLPI #15: [Elétrica - Iluminação] Matheus - Sem iluminação\nCliente: Matheus\nSetor: Elétrica - Iluminação	t	t	\N	2026-02-05 16:21:29.321
264815de-0341-426a-ad0a-2a1e71bc427f	5f81a952-2c88-4425-bd4d-8719fc7ed83c	944da2c8-af49-409e-8c7f-107064edfa1a	15	NEW_TICKET	Novo chamado GLPI #15: [Elétrica - Iluminação] Matheus - Sem iluminação\nCliente: Matheus\nSetor: Elétrica - Iluminação	t	t	\N	2026-02-05 16:21:29.332
001f7f56-dd31-4186-9f40-fe2c52dacc4f	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	1b497122-3ac9-477e-80d6-f539e275329b	17	NEW_TICKET	Novo chamado GLPI #17: [TI - Infraestrutura] Robson - Solicito instalação de um sist...\nCliente: Robson\nSetor: TI - Infraestrutura	t	t	\N	2026-02-05 16:54:17.47
a3cb4f0e-3cca-453c-81c3-7d863f4fde27	ae36293d-5338-4197-9e47-36eb81daa55a	944da2c8-af49-409e-8c7f-107064edfa1a	15	NEW_TICKET	Novo chamado GLPI #15: [Elétrica - Iluminação] Matheus - Sem iluminação\nCliente: Matheus\nSetor: Elétrica - Iluminação	t	t	\N	2026-02-05 16:21:29.351
9fa4590a-cff9-461b-bd3a-d48eb47c820b	5977460f-e0d8-4898-8c97-46dd1a53fbd1	944da2c8-af49-409e-8c7f-107064edfa1a	15	NEW_TICKET	Novo chamado GLPI #15: [Elétrica - Iluminação] Matheus - Sem iluminação\nCliente: Matheus\nSetor: Elétrica - Iluminação	f	t	\N	2026-02-05 16:21:29.364
1955fdee-742f-4e6e-86ca-1073adffde22	db48567c-8bf7-4d52-ab18-abbf282fbb4f	657a2ae3-b352-4e89-bbc7-c7328d795090	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Rayane - Jarbas passou que seria proble...\nCliente: Rayane\nSetor: TI - Hardware	t	t	\N	2026-02-05 16:31:57.582
ee2d3d39-37c0-4358-8c6b-4e480a766b2e	5f81a952-2c88-4425-bd4d-8719fc7ed83c	cc52a66a-426e-4bfb-8187-458d0c365b8f	19	NEW_TICKET	Novo chamado GLPI #19: Relatório de Serviço: Infraestrutura\nCliente: N/A\nSetor: TI	t	t	\N	2026-02-05 18:39:36.488
047e2fc1-eae1-428d-a16f-dfdea35d158f	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	657a2ae3-b352-4e89-bbc7-c7328d795090	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Rayane - Jarbas passou que seria proble...\nCliente: Rayane\nSetor: TI - Hardware	t	t	\N	2026-02-05 16:31:57.599
24300599-2528-411b-bc94-34bc722c9638	5f81a952-2c88-4425-bd4d-8719fc7ed83c	1b497122-3ac9-477e-80d6-f539e275329b	17	NEW_TICKET	Novo chamado GLPI #17: [TI - Infraestrutura] Robson - Solicito instalação de um sist...\nCliente: Robson\nSetor: TI - Infraestrutura	t	t	\N	2026-02-05 16:54:17.478
e05bcef9-5859-4402-91c9-a622b37bccc3	5f81a952-2c88-4425-bd4d-8719fc7ed83c	657a2ae3-b352-4e89-bbc7-c7328d795090	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Rayane - Jarbas passou que seria proble...\nCliente: Rayane\nSetor: TI - Hardware	t	t	\N	2026-02-05 16:31:57.624
6e4fd997-7108-4e09-b292-27e25aedfbdf	982d13c3-acf4-482d-96ed-246ad343be5d	657a2ae3-b352-4e89-bbc7-c7328d795090	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Rayane - Jarbas passou que seria proble...\nCliente: Rayane\nSetor: TI - Hardware	f	t	\N	2026-02-05 16:31:57.634
92e9d532-4d63-4965-95ef-b304aca9ffcb	ae36293d-5338-4197-9e47-36eb81daa55a	657a2ae3-b352-4e89-bbc7-c7328d795090	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Rayane - Jarbas passou que seria proble...\nCliente: Rayane\nSetor: TI - Hardware	t	t	\N	2026-02-05 16:31:57.64
cd6c963c-22ac-45aa-a46f-387ef4753f83	5977460f-e0d8-4898-8c97-46dd1a53fbd1	657a2ae3-b352-4e89-bbc7-c7328d795090	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Rayane - Jarbas passou que seria proble...\nCliente: Rayane\nSetor: TI - Hardware	f	t	\N	2026-02-05 16:31:57.652
6a2e6868-f362-4cea-85fe-67dc6c72f636	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	d4ff27bd-d13f-4fb0-b15e-971b2dce048b	\N	NEW_TICKET	Novo chamado (Bot): [Elétrica - Tomadas] Matheus - Preciso de uma tomada\nCliente: Matheus\nSetor: Elétrica - Tomadas	t	t	\N	2026-02-05 16:58:49.916
41d6ddbe-0559-44f9-a5e2-64960f4f17ca	db48567c-8bf7-4d52-ab18-abbf282fbb4f	1b497122-3ac9-477e-80d6-f539e275329b	17	NEW_TICKET	Novo chamado GLPI #17: [TI - Infraestrutura] Robson - Solicito instalação de um sist...\nCliente: Robson\nSetor: TI - Infraestrutura	t	t	\N	2026-02-05 16:54:17.455
a03cf04a-526e-4715-b9ad-fe406a328b31	5977460f-e0d8-4898-8c97-46dd1a53fbd1	1b497122-3ac9-477e-80d6-f539e275329b	17	NEW_TICKET	Novo chamado GLPI #17: [TI - Infraestrutura] Robson - Solicito instalação de um sist...\nCliente: Robson\nSetor: TI - Infraestrutura	t	t	\N	2026-02-05 16:54:17.489
c6e93872-ee3b-4bb9-97d7-d734d7ce062a	982d13c3-acf4-482d-96ed-246ad343be5d	1b497122-3ac9-477e-80d6-f539e275329b	17	NEW_TICKET	Novo chamado GLPI #17: [TI - Infraestrutura] Robson - Solicito instalação de um sist...\nCliente: Robson\nSetor: TI - Infraestrutura	f	t	\N	2026-02-05 16:54:17.499
98c7ac8f-a2c6-43a0-ab17-b4da985519c9	ae36293d-5338-4197-9e47-36eb81daa55a	d4ff27bd-d13f-4fb0-b15e-971b2dce048b	\N	NEW_TICKET	Novo chamado (Bot): [Elétrica - Tomadas] Matheus - Preciso de uma tomada\nCliente: Matheus\nSetor: Elétrica - Tomadas	t	t	\N	2026-02-05 16:58:49.952
0056b35e-0e6f-40ba-a93b-0019adf997ae	ae36293d-5338-4197-9e47-36eb81daa55a	1b497122-3ac9-477e-80d6-f539e275329b	17	NEW_TICKET	Novo chamado GLPI #17: [TI - Infraestrutura] Robson - Solicito instalação de um sist...\nCliente: Robson\nSetor: TI - Infraestrutura	t	t	\N	2026-02-05 16:54:17.506
7364ae71-eb9d-41bd-898d-ccf811273ca6	5f81a952-2c88-4425-bd4d-8719fc7ed83c	d4ff27bd-d13f-4fb0-b15e-971b2dce048b	\N	NEW_TICKET	Novo chamado (Bot): [Elétrica - Tomadas] Matheus - Preciso de uma tomada\nCliente: Matheus\nSetor: Elétrica - Tomadas	t	t	\N	2026-02-05 16:58:49.926
47712ce2-0808-4756-9ed2-9a88fd983177	db48567c-8bf7-4d52-ab18-abbf282fbb4f	d4ff27bd-d13f-4fb0-b15e-971b2dce048b	\N	NEW_TICKET	Novo chamado (Bot): [Elétrica - Tomadas] Matheus - Preciso de uma tomada\nCliente: Matheus\nSetor: Elétrica - Tomadas	t	t	\N	2026-02-05 16:58:49.904
2f2110ed-131e-4f4f-8f73-c5119249aea2	5977460f-e0d8-4898-8c97-46dd1a53fbd1	d4ff27bd-d13f-4fb0-b15e-971b2dce048b	\N	NEW_TICKET	Novo chamado (Bot): [Elétrica - Tomadas] Matheus - Preciso de uma tomada\nCliente: Matheus\nSetor: Elétrica - Tomadas	t	t	\N	2026-02-05 16:58:49.936
cb26a33d-a200-4fed-9499-7578a3acaf31	982d13c3-acf4-482d-96ed-246ad343be5d	d4ff27bd-d13f-4fb0-b15e-971b2dce048b	\N	NEW_TICKET	Novo chamado (Bot): [Elétrica - Tomadas] Matheus - Preciso de uma tomada\nCliente: Matheus\nSetor: Elétrica - Tomadas	f	t	\N	2026-02-05 16:58:49.945
c78a7b8e-eeb8-4f0e-bee0-37c41c15017a	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	cc52a66a-426e-4bfb-8187-458d0c365b8f	19	NEW_TICKET	Novo chamado GLPI #19: Relatório de Serviço: Infraestrutura\nCliente: N/A\nSetor: TI	t	t	\N	2026-02-05 18:39:36.47
9e7b372e-b8c3-47e5-83c2-3b453b500da3	db48567c-8bf7-4d52-ab18-abbf282fbb4f	cc52a66a-426e-4bfb-8187-458d0c365b8f	19	NEW_TICKET	Novo chamado GLPI #19: Relatório de Serviço: Infraestrutura\nCliente: N/A\nSetor: TI	t	t	\N	2026-02-05 18:39:36.439
96154820-e697-4620-8cec-8ea7010bf327	982d13c3-acf4-482d-96ed-246ad343be5d	cc52a66a-426e-4bfb-8187-458d0c365b8f	19	NEW_TICKET	Novo chamado GLPI #19: Relatório de Serviço: Infraestrutura\nCliente: N/A\nSetor: TI	f	t	\N	2026-02-05 18:39:36.501
66f4bee5-f16b-4005-8e4a-4f04212ad909	ae36293d-5338-4197-9e47-36eb81daa55a	cc52a66a-426e-4bfb-8187-458d0c365b8f	19	NEW_TICKET	Novo chamado GLPI #19: Relatório de Serviço: Infraestrutura\nCliente: N/A\nSetor: TI	t	t	\N	2026-02-05 18:39:36.51
0c3baad6-d9a8-41e4-bfbc-40734fcf778a	5977460f-e0d8-4898-8c97-46dd1a53fbd1	cc52a66a-426e-4bfb-8187-458d0c365b8f	19	NEW_TICKET	Novo chamado GLPI #19: Relatório de Serviço: Infraestrutura\nCliente: N/A\nSetor: TI	t	t	\N	2026-02-05 18:39:36.521
3efd8a05-7aab-4b86-a379-bb6c905e2d59	db48567c-8bf7-4d52-ab18-abbf282fbb4f	7277e487-10a9-4910-82cc-2094622093ec	20	NEW_TICKET	Novo chamado GLPI #20: [TI - Sistemas] Rayane - Movtrans saiu e pedi pro João ...\nCliente: Rayane\nSetor: Transporte	t	t	\N	2026-02-05 20:31:13.81
08dd8f91-6620-4c3c-a549-b219be9ee228	db48567c-8bf7-4d52-ab18-abbf282fbb4f	07e2706d-475d-46cb-99c8-84212b12f6e5	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Auto posto Correntao 2 - Solicito a troca de impressora...\nCliente: Auto posto Correntao 2\nSetor: Administrativo	t	t	\N	2026-02-06 18:28:34.606
2a82a314-8d02-4018-bc93-eb5f58b90195	5f81a952-2c88-4425-bd4d-8719fc7ed83c	7277e487-10a9-4910-82cc-2094622093ec	20	NEW_TICKET	Novo chamado GLPI #20: [TI - Sistemas] Rayane - Movtrans saiu e pedi pro João ...\nCliente: Rayane\nSetor: Transporte	t	t	\N	2026-02-05 20:31:13.827
e6095f52-070f-4a5f-9102-fd9d4b917cda	982d13c3-acf4-482d-96ed-246ad343be5d	7277e487-10a9-4910-82cc-2094622093ec	20	NEW_TICKET	Novo chamado GLPI #20: [TI - Sistemas] Rayane - Movtrans saiu e pedi pro João ...\nCliente: Rayane\nSetor: Transporte	f	t	\N	2026-02-05 20:31:13.837
f9fd2fa1-ae59-4d00-b73c-928d03351025	db48567c-8bf7-4d52-ab18-abbf282fbb4f	a8e29ff9-c336-4396-842a-f2c11cdfa24b	21	NEW_TICKET	Novo chamado GLPI #21: Falar com Técnico\nCliente: Kauã Araújo Silva\nSetor: T.I	t	t	\N	2026-02-06 13:36:50.684
07afdf99-9709-430c-9dbd-5fa772aaed43	ae36293d-5338-4197-9e47-36eb81daa55a	7277e487-10a9-4910-82cc-2094622093ec	20	NEW_TICKET	Novo chamado GLPI #20: [TI - Sistemas] Rayane - Movtrans saiu e pedi pro João ...\nCliente: Rayane\nSetor: Transporte	t	t	\N	2026-02-05 20:31:13.844
d28a557f-28be-4a4b-abf2-8352c3b427d1	5977460f-e0d8-4898-8c97-46dd1a53fbd1	7277e487-10a9-4910-82cc-2094622093ec	20	NEW_TICKET	Novo chamado GLPI #20: [TI - Sistemas] Rayane - Movtrans saiu e pedi pro João ...\nCliente: Rayane\nSetor: Transporte	t	t	\N	2026-02-05 20:31:13.855
ca6aa457-2f8b-47c8-babd-9df0d4957109	982d13c3-acf4-482d-96ed-246ad343be5d	07e2706d-475d-46cb-99c8-84212b12f6e5	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Auto posto Correntao 2 - Solicito a troca de impressora...\nCliente: Auto posto Correntao 2\nSetor: Administrativo	f	t	\N	2026-02-06 18:28:34.564
6da88ca7-a0c1-40ee-9c31-cd93809ec91f	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	7277e487-10a9-4910-82cc-2094622093ec	20	NEW_TICKET	Novo chamado GLPI #20: [TI - Sistemas] Rayane - Movtrans saiu e pedi pro João ...\nCliente: Rayane\nSetor: Transporte	t	t	\N	2026-02-05 20:31:13.868
d87a2bf9-7ca3-49bc-9ad2-f4f675d06bcd	5f81a952-2c88-4425-bd4d-8719fc7ed83c	a8e29ff9-c336-4396-842a-f2c11cdfa24b	21	NEW_TICKET	Novo chamado GLPI #21: Falar com Técnico\nCliente: Kauã Araújo Silva\nSetor: T.I	t	t	\N	2026-02-06 13:36:50.585
fb2ae93f-81dc-4ca1-a6e4-99c988065c55	982d13c3-acf4-482d-96ed-246ad343be5d	a8e29ff9-c336-4396-842a-f2c11cdfa24b	21	NEW_TICKET	Novo chamado GLPI #21: Falar com Técnico\nCliente: Kauã Araújo Silva\nSetor: T.I	f	t	\N	2026-02-06 13:36:50.601
7a070147-d9ce-4ca9-9ea3-3055aca66d32	ae36293d-5338-4197-9e47-36eb81daa55a	a8e29ff9-c336-4396-842a-f2c11cdfa24b	21	NEW_TICKET	Novo chamado GLPI #21: Falar com Técnico\nCliente: Kauã Araújo Silva\nSetor: T.I	t	t	\N	2026-02-06 13:36:50.608
2652775f-0aec-43d7-a4a5-08df4fa0e347	ae36293d-5338-4197-9e47-36eb81daa55a	07e2706d-475d-46cb-99c8-84212b12f6e5	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Auto posto Correntao 2 - Solicito a troca de impressora...\nCliente: Auto posto Correntao 2\nSetor: Administrativo	t	t	\N	2026-02-06 18:28:34.576
c36b96d1-ee3d-42d8-ad97-a2324f97e5d2	5977460f-e0d8-4898-8c97-46dd1a53fbd1	a8e29ff9-c336-4396-842a-f2c11cdfa24b	21	NEW_TICKET	Novo chamado GLPI #21: Falar com Técnico\nCliente: Kauã Araújo Silva\nSetor: T.I	t	t	\N	2026-02-06 13:36:50.617
71edf5a5-bfec-498f-a355-666c83606d45	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	a8e29ff9-c336-4396-842a-f2c11cdfa24b	21	NEW_TICKET	Novo chamado GLPI #21: Falar com Técnico\nCliente: Kauã Araújo Silva\nSetor: T.I	t	t	\N	2026-02-06 13:36:50.638
1a2c2723-7d54-4992-b684-40145a58bbcc	5f81a952-2c88-4425-bd4d-8719fc7ed83c	45c501d2-bd09-4d00-b547-7aacefbbf562	23	NEW_TICKET	Novo chamado GLPI #23: [TI - Infraestrutura] Raquel - Instabilidade na internet\nCliente: Raquel\nSetor: Caixa	t	t	\N	2026-02-06 22:49:17.16
364169d1-2593-4bdb-8067-801f53d8bb5c	5977460f-e0d8-4898-8c97-46dd1a53fbd1	07e2706d-475d-46cb-99c8-84212b12f6e5	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Auto posto Correntao 2 - Solicito a troca de impressora...\nCliente: Auto posto Correntao 2\nSetor: Administrativo	t	t	\N	2026-02-06 18:28:34.586
ee638f59-0ff9-4dc9-91c2-d3a20bbc8454	5f81a952-2c88-4425-bd4d-8719fc7ed83c	07e2706d-475d-46cb-99c8-84212b12f6e5	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Auto posto Correntao 2 - Solicito a troca de impressora...\nCliente: Auto posto Correntao 2\nSetor: Administrativo	t	t	\N	2026-02-06 18:28:34.621
9e6d1983-48c0-41c1-b2b6-eaf2e68de4e2	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	07e2706d-475d-46cb-99c8-84212b12f6e5	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Auto posto Correntao 2 - Solicito a troca de impressora...\nCliente: Auto posto Correntao 2\nSetor: Administrativo	t	t	\N	2026-02-06 18:28:34.597
2dc22da4-0d1d-4a2d-be91-63aa6390e151	ae36293d-5338-4197-9e47-36eb81daa55a	45c501d2-bd09-4d00-b547-7aacefbbf562	23	NEW_TICKET	Novo chamado GLPI #23: [TI - Infraestrutura] Raquel - Instabilidade na internet\nCliente: Raquel\nSetor: Caixa	t	t	\N	2026-02-06 22:49:17.135
4b5b1985-38ba-4ab4-9ee0-4fbef0620a56	5977460f-e0d8-4898-8c97-46dd1a53fbd1	45c501d2-bd09-4d00-b547-7aacefbbf562	23	NEW_TICKET	Novo chamado GLPI #23: [TI - Infraestrutura] Raquel - Instabilidade na internet\nCliente: Raquel\nSetor: Caixa	t	t	\N	2026-02-06 22:49:17.113
95e5b44b-cff9-4596-addf-de29c1733742	982d13c3-acf4-482d-96ed-246ad343be5d	45c501d2-bd09-4d00-b547-7aacefbbf562	23	NEW_TICKET	Novo chamado GLPI #23: [TI - Infraestrutura] Raquel - Instabilidade na internet\nCliente: Raquel\nSetor: Caixa	f	t	\N	2026-02-06 22:49:17.129
6d5a6ee4-e2c0-4a9c-884e-9377bbbbd276	db48567c-8bf7-4d52-ab18-abbf282fbb4f	45c501d2-bd09-4d00-b547-7aacefbbf562	23	NEW_TICKET	Novo chamado GLPI #23: [TI - Infraestrutura] Raquel - Instabilidade na internet\nCliente: Raquel\nSetor: Caixa	t	t	\N	2026-02-06 22:49:17.152
08b83510-223f-46fd-82bc-f55d297aeb15	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	45c501d2-bd09-4d00-b547-7aacefbbf562	23	NEW_TICKET	Novo chamado GLPI #23: [TI - Infraestrutura] Raquel - Instabilidade na internet\nCliente: Raquel\nSetor: Caixa	t	t	\N	2026-02-06 22:49:17.143
852a452b-8b54-4907-9352-44a0d6f7e5c8	5977460f-e0d8-4898-8c97-46dd1a53fbd1	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Caixa - Bom dia\n\nEstamos sem internet ...\nCliente: Caixa\nSetor: Pista	t	t	\N	2026-02-07 13:21:59.956
5ac70250-1b49-490c-835f-98b1c797536d	982d13c3-acf4-482d-96ed-246ad343be5d	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Caixa - Bom dia\n\nEstamos sem internet ...\nCliente: Caixa\nSetor: Pista	f	t	\N	2026-02-07 13:21:59.982
0a8f2698-77ba-4db7-bab9-d4de68b50c6e	ae36293d-5338-4197-9e47-36eb81daa55a	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Caixa - Bom dia\n\nEstamos sem internet ...\nCliente: Caixa\nSetor: Pista	t	t	\N	2026-02-07 13:21:59.988
c1279b2b-a144-4b22-8b21-4880faf01f6a	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Caixa - Bom dia\n\nEstamos sem internet ...\nCliente: Caixa\nSetor: Pista	t	t	\N	2026-02-07 13:21:59.998
d04c2f30-742d-4f05-ba49-0422743f73b8	5977460f-e0d8-4898-8c97-46dd1a53fbd1	d9f28841-e333-46b3-9866-b479f2d51af0	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Italo Nunes - Não sair daqui\nCliente: Italo Nunes\nSetor: Contabilidade	t	t	\N	2026-02-09 13:53:16.176
35e7236c-841e-4008-a7b0-f96254dde9bc	db48567c-8bf7-4d52-ab18-abbf282fbb4f	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Caixa - Bom dia\n\nEstamos sem internet ...\nCliente: Caixa\nSetor: Pista	t	t	\N	2026-02-07 13:22:00.007
3221aede-3bc2-4016-aa03-493ab066d4be	5f81a952-2c88-4425-bd4d-8719fc7ed83c	7c58fa06-a74e-4b9e-8723-a6853d0fbe24	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Caixa - Bom dia\n\nEstamos sem internet ...\nCliente: Caixa\nSetor: Pista	t	t	\N	2026-02-07 13:22:00.018
74e4c696-6749-4c82-b2b3-258bba472335	5977460f-e0d8-4898-8c97-46dd1a53fbd1	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	27	NEW_TICKET	Novo chamado GLPI #27: Falar com Técnico\nCliente: karolne, setor financeiro\nSetor: finaceiro	t	t	\N	2026-02-09 22:13:04.316
185d0290-9c7d-4ed8-88b2-7e7933a80c03	5977460f-e0d8-4898-8c97-46dd1a53fbd1	a8d5518a-7849-4eae-8359-69f601737e70	25	NEW_TICKET	Novo chamado GLPI #25: [TI - Infraestrutura] Lucélia Deocont - sem acesso a áre de trabalho r...\nCliente: Lucélia Deocont\nSetor: contabilidade	t	t	\N	2026-02-09 13:33:30.912
3ac3707e-fbcd-44ba-8d8f-cc9cf0964765	982d13c3-acf4-482d-96ed-246ad343be5d	a8d5518a-7849-4eae-8359-69f601737e70	25	NEW_TICKET	Novo chamado GLPI #25: [TI - Infraestrutura] Lucélia Deocont - sem acesso a áre de trabalho r...\nCliente: Lucélia Deocont\nSetor: contabilidade	f	t	\N	2026-02-09 13:33:30.93
b5077e9b-a306-46e6-8c76-ee1b21580b47	db48567c-8bf7-4d52-ab18-abbf282fbb4f	d9f28841-e333-46b3-9866-b479f2d51af0	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Italo Nunes - Não sair daqui\nCliente: Italo Nunes\nSetor: Contabilidade	t	t	\N	2026-02-09 13:53:16.2
11c527fb-24fc-44cd-a9e5-d3ce8ae0cda5	ae36293d-5338-4197-9e47-36eb81daa55a	a8d5518a-7849-4eae-8359-69f601737e70	25	NEW_TICKET	Novo chamado GLPI #25: [TI - Infraestrutura] Lucélia Deocont - sem acesso a áre de trabalho r...\nCliente: Lucélia Deocont\nSetor: contabilidade	t	t	\N	2026-02-09 13:33:30.942
d8059b68-54b3-4592-8f1d-efc2103ebeb9	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	a8d5518a-7849-4eae-8359-69f601737e70	25	NEW_TICKET	Novo chamado GLPI #25: [TI - Infraestrutura] Lucélia Deocont - sem acesso a áre de trabalho r...\nCliente: Lucélia Deocont\nSetor: contabilidade	t	t	\N	2026-02-09 13:33:30.964
3511c27a-bf1a-4595-a9a1-92c92407f9b0	982d13c3-acf4-482d-96ed-246ad343be5d	d9f28841-e333-46b3-9866-b479f2d51af0	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Italo Nunes - Não sair daqui\nCliente: Italo Nunes\nSetor: Contabilidade	f	t	\N	2026-02-09 13:53:16.245
73e68be1-7b96-4301-a396-618fac138695	db48567c-8bf7-4d52-ab18-abbf282fbb4f	a8d5518a-7849-4eae-8359-69f601737e70	25	NEW_TICKET	Novo chamado GLPI #25: [TI - Infraestrutura] Lucélia Deocont - sem acesso a áre de trabalho r...\nCliente: Lucélia Deocont\nSetor: contabilidade	t	t	\N	2026-02-09 13:33:30.974
b23e1ce3-116a-4c24-a434-71d9bd970b7a	5f81a952-2c88-4425-bd4d-8719fc7ed83c	a8d5518a-7849-4eae-8359-69f601737e70	25	NEW_TICKET	Novo chamado GLPI #25: [TI - Infraestrutura] Lucélia Deocont - sem acesso a áre de trabalho r...\nCliente: Lucélia Deocont\nSetor: contabilidade	t	t	\N	2026-02-09 13:33:30.996
13208c55-4af7-4c39-8eed-bf1ab58bedc3	5977460f-e0d8-4898-8c97-46dd1a53fbd1	8e5c9137-92ff-4748-b873-1bb29de24aba	\N	NEW_TICKET	Novo chamado (Bot): Falar com Técnico\nCliente: Elissandra dias\nSetor: Contabilidade	t	t	\N	2026-02-10 00:16:49.196
294c652e-fb1d-47f3-8bf0-84776f46864c	ae36293d-5338-4197-9e47-36eb81daa55a	d9f28841-e333-46b3-9866-b479f2d51af0	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Italo Nunes - Não sair daqui\nCliente: Italo Nunes\nSetor: Contabilidade	t	t	\N	2026-02-09 13:53:16.269
6549ab4a-a1a3-42ee-a334-18a0daa03823	db48567c-8bf7-4d52-ab18-abbf282fbb4f	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	27	NEW_TICKET	Novo chamado GLPI #27: Falar com Técnico\nCliente: karolne, setor financeiro\nSetor: finaceiro	t	t	\N	2026-02-09 22:13:04.338
da1a31ae-d690-47d5-b9f6-d2a43c9b4f1d	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	d9f28841-e333-46b3-9866-b479f2d51af0	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Italo Nunes - Não sair daqui\nCliente: Italo Nunes\nSetor: Contabilidade	t	t	\N	2026-02-09 13:53:16.279
2026d13c-fe97-45f9-93fe-8c60413f5ade	5f81a952-2c88-4425-bd4d-8719fc7ed83c	d9f28841-e333-46b3-9866-b479f2d51af0	\N	NEW_TICKET	Novo chamado (Bot): [TI - Infraestrutura] Italo Nunes - Não sair daqui\nCliente: Italo Nunes\nSetor: Contabilidade	t	t	\N	2026-02-09 13:53:16.288
35c7f197-7bd3-4c58-aeb2-bab8c8c83ce8	b8f6ec9e-45a9-4566-96ff-ec34003657a5	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	27	NEW_TICKET	Novo chamado GLPI #27: Falar com Técnico\nCliente: karolne, setor financeiro\nSetor: finaceiro	t	t	\N	2026-02-09 22:13:04.392
487d4c84-cd65-4a89-8ef3-c1f384aa4045	982d13c3-acf4-482d-96ed-246ad343be5d	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	27	NEW_TICKET	Novo chamado GLPI #27: Falar com Técnico\nCliente: karolne, setor financeiro\nSetor: finaceiro	f	t	\N	2026-02-09 22:13:04.349
a6721410-7e15-4abc-9352-13a82af9c377	ae36293d-5338-4197-9e47-36eb81daa55a	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	27	NEW_TICKET	Novo chamado GLPI #27: Falar com Técnico\nCliente: karolne, setor financeiro\nSetor: finaceiro	t	t	\N	2026-02-09 22:13:04.356
637133ab-1d7d-48f5-ac9c-a7aee5d36980	5f81a952-2c88-4425-bd4d-8719fc7ed83c	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	27	NEW_TICKET	Novo chamado GLPI #27: Falar com Técnico\nCliente: karolne, setor financeiro\nSetor: finaceiro	t	t	\N	2026-02-09 22:13:04.377
0adf51c3-828d-40bf-985b-c20a55903394	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	75cc2cf7-c1df-4f14-bf9c-0b61cd185738	27	NEW_TICKET	Novo chamado GLPI #27: Falar com Técnico\nCliente: karolne, setor financeiro\nSetor: finaceiro	t	t	\N	2026-02-09 22:13:04.405
262e3af7-d5cc-4e2b-b512-bdb133f00e78	982d13c3-acf4-482d-96ed-246ad343be5d	8e5c9137-92ff-4748-b873-1bb29de24aba	\N	NEW_TICKET	Novo chamado (Bot): Falar com Técnico\nCliente: Elissandra dias\nSetor: Contabilidade	f	t	\N	2026-02-10 00:16:49.221
0f581b13-fc51-42f8-a21c-4e5a4dcc6e2d	db48567c-8bf7-4d52-ab18-abbf282fbb4f	8e5c9137-92ff-4748-b873-1bb29de24aba	\N	NEW_TICKET	Novo chamado (Bot): Falar com Técnico\nCliente: Elissandra dias\nSetor: Contabilidade	t	t	\N	2026-02-10 00:16:49.21
afde3484-9531-446c-9dc4-7dbc131b64ec	ae36293d-5338-4197-9e47-36eb81daa55a	8e5c9137-92ff-4748-b873-1bb29de24aba	\N	NEW_TICKET	Novo chamado (Bot): Falar com Técnico\nCliente: Elissandra dias\nSetor: Contabilidade	t	t	\N	2026-02-10 00:16:49.229
fae64e72-8afe-45a5-ad40-70a37d59e416	5f81a952-2c88-4425-bd4d-8719fc7ed83c	8e5c9137-92ff-4748-b873-1bb29de24aba	\N	NEW_TICKET	Novo chamado (Bot): Falar com Técnico\nCliente: Elissandra dias\nSetor: Contabilidade	t	t	\N	2026-02-10 00:16:49.241
0449e3c6-ee8e-40cd-91b5-00f74150ebc2	b8f6ec9e-45a9-4566-96ff-ec34003657a5	8e5c9137-92ff-4748-b873-1bb29de24aba	\N	NEW_TICKET	Novo chamado (Bot): Falar com Técnico\nCliente: Elissandra dias\nSetor: Contabilidade	t	t	\N	2026-02-10 00:16:49.252
8d2a3e76-b3db-4953-99d9-997322c39486	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	8e5c9137-92ff-4748-b873-1bb29de24aba	\N	NEW_TICKET	Novo chamado (Bot): Falar com Técnico\nCliente: Elissandra dias\nSetor: Contabilidade	t	t	\N	2026-02-10 00:16:49.264
28e2408c-cc3d-451d-bb50-88d10cf89c09	db48567c-8bf7-4d52-ab18-abbf282fbb4f	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...\nCliente: Orlan Aguilar\nSetor: Engenharia	t	t	\N	2026-02-10 16:30:37.445
12ffe20e-6fe0-4b53-bf1f-998d2139582a	5977460f-e0d8-4898-8c97-46dd1a53fbd1	4c344610-476d-47ce-ac21-3f775ae08df7	29	NEW_TICKET	Novo chamado GLPI #29: [Elétrica - Iluminação] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Engenharia	t	t	\N	2026-02-10 14:36:51.138
10646ba6-5e3a-43e9-a509-759b7b533581	db48567c-8bf7-4d52-ab18-abbf282fbb4f	4c344610-476d-47ce-ac21-3f775ae08df7	29	NEW_TICKET	Novo chamado GLPI #29: [Elétrica - Iluminação] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Engenharia	t	t	\N	2026-02-10 14:36:51.154
c53dd3c6-980c-4723-8245-993f877b3f47	982d13c3-acf4-482d-96ed-246ad343be5d	4c344610-476d-47ce-ac21-3f775ae08df7	29	NEW_TICKET	Novo chamado GLPI #29: [Elétrica - Iluminação] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Engenharia	f	t	\N	2026-02-10 14:36:51.164
bf820694-f2c0-4ed5-a3dc-24f5e2492466	982d13c3-acf4-482d-96ed-246ad343be5d	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...\nCliente: Orlan Aguilar\nSetor: Engenharia	f	t	\N	2026-02-10 16:30:37.466
1e7e0579-d002-4759-b64b-6e4e4a710e78	ae36293d-5338-4197-9e47-36eb81daa55a	4c344610-476d-47ce-ac21-3f775ae08df7	29	NEW_TICKET	Novo chamado GLPI #29: [Elétrica - Iluminação] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Engenharia	t	t	\N	2026-02-10 14:36:51.172
c452c838-d9da-4fb6-a877-732c0ed881a2	5f81a952-2c88-4425-bd4d-8719fc7ed83c	4c344610-476d-47ce-ac21-3f775ae08df7	29	NEW_TICKET	Novo chamado GLPI #29: [Elétrica - Iluminação] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Engenharia	t	t	\N	2026-02-10 14:36:51.182
7d5c2b05-1e45-46c7-a144-43f146daa924	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	5a157e31-16da-4ffa-af1f-816f0b582d0b	31	NEW_TICKET	Novo chamado GLPI #31: [TI - Hardware] Siloni - Boa tarde solicito avaliações ...\nCliente: Siloni\nSetor: administrativo	t	t	\N	2026-02-10 18:15:51.88
331624bb-e093-4f1c-a352-9ef76d19ce0b	b8f6ec9e-45a9-4566-96ff-ec34003657a5	4c344610-476d-47ce-ac21-3f775ae08df7	29	NEW_TICKET	Novo chamado GLPI #29: [Elétrica - Iluminação] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Engenharia	t	t	\N	2026-02-10 14:36:51.192
7637f5c4-7ad6-41c2-a0c8-db224e780a6f	ae36293d-5338-4197-9e47-36eb81daa55a	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...\nCliente: Orlan Aguilar\nSetor: Engenharia	t	t	\N	2026-02-10 16:30:37.478
cd31005e-6b12-469e-ab18-ad5cec2b8b50	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	4c344610-476d-47ce-ac21-3f775ae08df7	29	NEW_TICKET	Novo chamado GLPI #29: [Elétrica - Iluminação] Magna - Precisamos de manutenção na il...\nCliente: Magna\nSetor: Engenharia	t	t	\N	2026-02-10 14:36:51.209
43726ec9-dfe6-4a51-b46c-00b106690054	5977460f-e0d8-4898-8c97-46dd1a53fbd1	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...\nCliente: Orlan Aguilar\nSetor: Engenharia	t	t	\N	2026-02-10 16:30:37.422
ab5eb650-20c8-4178-a56d-105b0cfe542a	f874a603-896e-42d5-8887-e4b78b6fab06	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...\nCliente: Orlan Aguilar\nSetor: Engenharia	t	t	\N	2026-02-10 16:30:37.527
84f5bbb6-3e82-4d5b-ae80-9043e72d7a6a	5f81a952-2c88-4425-bd4d-8719fc7ed83c	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...\nCliente: Orlan Aguilar\nSetor: Engenharia	t	t	\N	2026-02-10 16:30:37.489
f0a5d33a-39d2-46e4-956f-a1f23ee8e6bb	ae36293d-5338-4197-9e47-36eb81daa55a	5a157e31-16da-4ffa-af1f-816f0b582d0b	31	NEW_TICKET	Novo chamado GLPI #31: [TI - Hardware] Siloni - Boa tarde solicito avaliações ...\nCliente: Siloni\nSetor: administrativo	t	t	\N	2026-02-10 18:15:51.853
8e0893a5-51b2-4c47-8ec9-8a2d3d27dfad	b8f6ec9e-45a9-4566-96ff-ec34003657a5	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...\nCliente: Orlan Aguilar\nSetor: Engenharia	t	t	\N	2026-02-10 16:30:37.503
5b20a3c4-676f-4aa8-91c7-37c4f7035480	5977460f-e0d8-4898-8c97-46dd1a53fbd1	5a157e31-16da-4ffa-af1f-816f0b582d0b	31	NEW_TICKET	Novo chamado GLPI #31: [TI - Hardware] Siloni - Boa tarde solicito avaliações ...\nCliente: Siloni\nSetor: administrativo	t	t	\N	2026-02-10 18:15:51.823
fe34dd0c-6760-4ee7-a463-b11c39627c1d	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...\nCliente: Orlan Aguilar\nSetor: Engenharia	t	t	\N	2026-02-10 16:30:37.514
4213236c-40a5-4bda-9d59-96edd2f35fca	db48567c-8bf7-4d52-ab18-abbf282fbb4f	5a157e31-16da-4ffa-af1f-816f0b582d0b	31	NEW_TICKET	Novo chamado GLPI #31: [TI - Hardware] Siloni - Boa tarde solicito avaliações ...\nCliente: Siloni\nSetor: administrativo	t	t	\N	2026-02-10 18:15:51.836
a12a2117-d1c3-4645-a9db-c3f8b9c8f238	982d13c3-acf4-482d-96ed-246ad343be5d	5a157e31-16da-4ffa-af1f-816f0b582d0b	31	NEW_TICKET	Novo chamado GLPI #31: [TI - Hardware] Siloni - Boa tarde solicito avaliações ...\nCliente: Siloni\nSetor: administrativo	f	t	\N	2026-02-10 18:15:51.845
a0b4b120-6ec6-4359-b81e-b36b6f351f2e	b8f6ec9e-45a9-4566-96ff-ec34003657a5	5a157e31-16da-4ffa-af1f-816f0b582d0b	31	NEW_TICKET	Novo chamado GLPI #31: [TI - Hardware] Siloni - Boa tarde solicito avaliações ...\nCliente: Siloni\nSetor: administrativo	t	t	\N	2026-02-10 18:15:51.871
375e8c78-b8ff-421e-9840-5bd779be9055	5f81a952-2c88-4425-bd4d-8719fc7ed83c	5a157e31-16da-4ffa-af1f-816f0b582d0b	31	NEW_TICKET	Novo chamado GLPI #31: [TI - Hardware] Siloni - Boa tarde solicito avaliações ...\nCliente: Siloni\nSetor: administrativo	t	t	\N	2026-02-10 18:15:51.862
37ae7679-7b8f-4996-aa3e-a59514fe1492	f874a603-896e-42d5-8887-e4b78b6fab06	5a157e31-16da-4ffa-af1f-816f0b582d0b	31	NEW_TICKET	Novo chamado GLPI #31: [TI - Hardware] Siloni - Boa tarde solicito avaliações ...\nCliente: Siloni\nSetor: administrativo	t	t	\N	2026-02-10 18:15:51.89
72d269d3-37ba-43e4-89ea-3f3ae562c8cd	982d13c3-acf4-482d-96ed-246ad343be5d	820ed333-b45b-4b03-8196-c70198aad605	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Xão - Substituição de impressora par...\nCliente: Xão\nSetor: Controladoria	f	t	\N	2026-02-10 19:23:33.112
4b3a37e7-242d-4f40-a8c4-ae9a2a3b034a	5977460f-e0d8-4898-8c97-46dd1a53fbd1	820ed333-b45b-4b03-8196-c70198aad605	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Xão - Substituição de impressora par...\nCliente: Xão\nSetor: Controladoria	t	t	\N	2026-02-10 19:23:33.078
3e1a8d42-797b-4f55-a395-284c639b2f2f	db48567c-8bf7-4d52-ab18-abbf282fbb4f	820ed333-b45b-4b03-8196-c70198aad605	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Xão - Substituição de impressora par...\nCliente: Xão\nSetor: Controladoria	t	t	\N	2026-02-10 19:23:33.092
ee0d3a83-ea48-4c11-afb5-b70dd2ba12bd	ae36293d-5338-4197-9e47-36eb81daa55a	820ed333-b45b-4b03-8196-c70198aad605	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Xão - Substituição de impressora par...\nCliente: Xão\nSetor: Controladoria	t	t	\N	2026-02-10 19:23:33.12
d285f19d-d537-462a-ab06-136d1aea354c	5f81a952-2c88-4425-bd4d-8719fc7ed83c	4e27abed-5458-44f4-9afa-51455cb2da96	33	NEW_TICKET	Novo chamado GLPI #33: [TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...\nCliente: Eduarda\nSetor: Engenharia	t	t	\N	2026-02-10 21:39:49.701
0f35ea94-faaa-4f62-ad72-bd1bcd0b868f	5f81a952-2c88-4425-bd4d-8719fc7ed83c	820ed333-b45b-4b03-8196-c70198aad605	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Xão - Substituição de impressora par...\nCliente: Xão\nSetor: Controladoria	t	t	\N	2026-02-10 19:23:33.13
5f878bce-1e8e-4a67-b204-27498c19bbe0	b8f6ec9e-45a9-4566-96ff-ec34003657a5	820ed333-b45b-4b03-8196-c70198aad605	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Xão - Substituição de impressora par...\nCliente: Xão\nSetor: Controladoria	t	t	\N	2026-02-10 19:23:33.141
390d6054-f112-4608-ba83-c9986de4959e	ae36293d-5338-4197-9e47-36eb81daa55a	2751b040-e639-46f6-8686-87b8bf741833	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] João - Troca da impressora\nCliente: João\nSetor: Controladoria	t	t	\N	2026-02-11 13:33:54.02
54d99ad9-ac01-4ca9-978e-a40908514395	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	820ed333-b45b-4b03-8196-c70198aad605	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Xão - Substituição de impressora par...\nCliente: Xão\nSetor: Controladoria	t	t	\N	2026-02-10 19:23:33.149
8d09f217-6458-4e2b-89a1-db5ad7396570	b8f6ec9e-45a9-4566-96ff-ec34003657a5	4e27abed-5458-44f4-9afa-51455cb2da96	33	NEW_TICKET	Novo chamado GLPI #33: [TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...\nCliente: Eduarda\nSetor: Engenharia	t	t	\N	2026-02-10 21:39:49.711
bcf12557-4ecd-4f8f-9b35-9242a60099ab	f874a603-896e-42d5-8887-e4b78b6fab06	820ed333-b45b-4b03-8196-c70198aad605	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] Xão - Substituição de impressora par...\nCliente: Xão\nSetor: Controladoria	t	t	\N	2026-02-10 19:23:33.159
2c33c77c-2f1b-48dc-8420-de87a05416b5	5977460f-e0d8-4898-8c97-46dd1a53fbd1	4e27abed-5458-44f4-9afa-51455cb2da96	33	NEW_TICKET	Novo chamado GLPI #33: [TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...\nCliente: Eduarda\nSetor: Engenharia	t	t	\N	2026-02-10 21:39:49.658
e8ad1734-5ff2-4648-b0c6-aafce267f154	db48567c-8bf7-4d52-ab18-abbf282fbb4f	4e27abed-5458-44f4-9afa-51455cb2da96	33	NEW_TICKET	Novo chamado GLPI #33: [TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...\nCliente: Eduarda\nSetor: Engenharia	t	t	\N	2026-02-10 21:39:49.675
bcd489ce-3527-4b2a-a1d0-9680bc622068	982d13c3-acf4-482d-96ed-246ad343be5d	4e27abed-5458-44f4-9afa-51455cb2da96	33	NEW_TICKET	Novo chamado GLPI #33: [TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...\nCliente: Eduarda\nSetor: Engenharia	f	t	\N	2026-02-10 21:39:49.684
8e5f4fd2-ac28-4604-9260-2ccd5f74a09a	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	4e27abed-5458-44f4-9afa-51455cb2da96	33	NEW_TICKET	Novo chamado GLPI #33: [TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...\nCliente: Eduarda\nSetor: Engenharia	t	t	\N	2026-02-10 21:39:49.719
f7f01655-9305-42a8-98bf-de4ad4186847	ae36293d-5338-4197-9e47-36eb81daa55a	4e27abed-5458-44f4-9afa-51455cb2da96	33	NEW_TICKET	Novo chamado GLPI #33: [TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...\nCliente: Eduarda\nSetor: Engenharia	t	t	\N	2026-02-10 21:39:49.692
922f4c19-b391-4fbc-8ae3-6f1a801e1f31	f874a603-896e-42d5-8887-e4b78b6fab06	2751b040-e639-46f6-8686-87b8bf741833	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] João - Troca da impressora\nCliente: João\nSetor: Controladoria	t	t	\N	2026-02-11 13:33:54.061
f0dc96c9-3277-4d3b-bed6-07e4efffd0ce	f874a603-896e-42d5-8887-e4b78b6fab06	4e27abed-5458-44f4-9afa-51455cb2da96	33	NEW_TICKET	Novo chamado GLPI #33: [TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...\nCliente: Eduarda\nSetor: Engenharia	t	t	\N	2026-02-10 21:39:49.729
0117d4cb-ed5f-4980-a6b8-2ebb1f2141a3	5f81a952-2c88-4425-bd4d-8719fc7ed83c	2751b040-e639-46f6-8686-87b8bf741833	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] João - Troca da impressora\nCliente: João\nSetor: Controladoria	t	t	\N	2026-02-11 13:33:54.032
808e6f6a-cee0-4dbc-9ffb-7c658b7547c9	5977460f-e0d8-4898-8c97-46dd1a53fbd1	2751b040-e639-46f6-8686-87b8bf741833	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] João - Troca da impressora\nCliente: João\nSetor: Controladoria	t	t	\N	2026-02-11 13:33:53.999
4577b1a5-ce19-4385-88c0-6678f8fd6fba	982d13c3-acf4-482d-96ed-246ad343be5d	2751b040-e639-46f6-8686-87b8bf741833	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] João - Troca da impressora\nCliente: João\nSetor: Controladoria	f	t	\N	2026-02-11 13:33:54.014
32731cc1-1ff9-40bb-a644-fac4b31b27db	b8f6ec9e-45a9-4566-96ff-ec34003657a5	2751b040-e639-46f6-8686-87b8bf741833	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] João - Troca da impressora\nCliente: João\nSetor: Controladoria	t	t	\N	2026-02-11 13:33:54.041
cc7b66e3-a165-4d59-8351-194e5402817f	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	2751b040-e639-46f6-8686-87b8bf741833	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] João - Troca da impressora\nCliente: João\nSetor: Controladoria	t	t	\N	2026-02-11 13:33:54.052
e240af97-895f-4fbb-9ac4-1978729a0d99	db48567c-8bf7-4d52-ab18-abbf282fbb4f	2751b040-e639-46f6-8686-87b8bf741833	\N	NEW_TICKET	Novo chamado (Bot): [TI - Hardware] João - Troca da impressora\nCliente: João\nSetor: Controladoria	t	t	\N	2026-02-11 13:33:54.072
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.tickets (id, "glpiId", title, description, status, priority, "phoneNumber", "customerName", sector, category, "assignedToId", "createdAt", "updatedAt", "closedAt", solution, "solutionType", "timeWorked", "escalatedAt", "awaitingRating", "ratedAt", rating, location, type) FROM stdin;
f105aff5-e90d-406e-a95e-b44042cdb7d0	6	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	126087875031102@lid	Matheus soares	Pedreira	Suporte	\N	2026-02-03 13:01:06.549	2026-02-03 16:22:17.439	2026-02-03 16:21:46.025	teste	software	0	\N	f	2026-02-03 16:22:17.437	5	\N	SUPPORT
32f6c054-cb16-4f62-982f-870f9bd3af65	7	[TI - Infraestrutura] Matheus soares - Sem conexão	Sem conexão	CLOSED	NORMAL	108366688944156@lid	Matheus soares	TI - Infraestrutura	Incidente	\N	2026-02-03 18:09:08.063	2026-02-03 18:15:46.24	2026-02-03 18:13:44.795	teste\n	software	0	\N	f	2026-02-03 18:15:46.239	5	\N	SUPPORT
d2e43e4f-521c-42be-9529-527fcb4bbdb7	9	[Elétrica - Iluminação] Matheus - Sem luz	Sem luz	CLOSED	NORMAL	108366688944156@lid	Matheus	Elétrica - Iluminação	Incidente	\N	2026-02-04 00:26:49.265	2026-02-04 01:01:47.57	2026-02-04 01:01:47.544	teste\n	software	0	\N	t	\N	\N	\N	SUPPORT
3f0edbce-4414-4693-b057-a0cd20b9b80b	13	[TI - Sistemas] rayane - puxar relatorio	puxar relatorio	CLOSED	NORMAL	206373245718763@lid	rayane	TI - Sistemas	TI - Sistemas	\N	2026-02-05 13:45:59.017	2026-02-05 13:58:00.482	2026-02-05 13:57:31.131	Erro comum de atalho do movtrans, só exclui um atalho e fiz outro.	software	5	\N	f	2026-02-05 13:58:00.481	5	\N	SUPPORT
1de87efd-790f-4f88-9008-17fa61a0d5cb	11	[TI - Infraestrutura] Magheus - Teste	Teste	CLOSED	NORMAL	126087875031102@lid	Magheus	TI - Infraestrutura	Incidente	a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	2026-02-04 19:01:13.647	2026-02-04 19:18:37.119	2026-02-04 19:15:20.192	Teste	usuario	0	\N	f	2026-02-04 19:18:37.117	5	\N	SUPPORT
b5ca04c1-09e9-4a00-9244-823770c3e794	10	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	169870285111400@lid	Victor Moreira	Engenharia	Incidente	\N	2026-02-04 18:50:39.785	2026-02-05 00:23:46.633	2026-02-05 00:23:46.598	Teste	software	0	\N	t	\N	\N	\N	SUPPORT
ec383cc6-b7f4-4156-9253-2e851eac214c	8	[TI - Sistemas] Matheus - Movtrans	Movtrans	CLOSED	NORMAL	108366688944156@lid	Matheus	TI - Sistemas	Incidente	\N	2026-02-03 18:16:28.484	2026-02-05 00:24:14.813	2026-02-05 00:24:14.802	Teste\n\n	software	0	\N	t	\N	\N	\N	SUPPORT
6c9e2a12-44ea-43fc-ab05-0497300b46bb	14	[TI - Hardware] INGRID - CONECTAR INTERNET E LIGAR O CO...	CONECTAR INTERNET E LIGAR O COMPUTADOR DA CATARINE QUE ESTA DO MEU LADO	CLOSED	NORMAL	206373245718763@lid	INGRID	TI - Hardware	Incidente	\N	2026-02-05 14:37:00.625	2026-02-05 15:03:03.68	2026-02-05 15:03:03.651	Ligação dos cabos de energia do computador/monitor e conectar o cabo de rede.	rede	15	\N	t	\N	\N	\N	SUPPORT
944da2c8-af49-409e-8c7f-107064edfa1a	15	[Elétrica - Iluminação] Matheus - Sem iluminação	Sem iluminação	CLOSED	NORMAL	108366688944156@lid	Matheus	Elétrica - Iluminação	Incidente	\N	2026-02-05 16:21:29.278	2026-02-05 16:58:21.825	2026-02-05 16:32:47.084	teste\n	software	0	\N	f	2026-02-05 16:58:21.824	5	\N	SUPPORT
1b497122-3ac9-477e-80d6-f539e275329b	17	[TI - Infraestrutura] Robson - Solicito instalação de um sist...	Solicito instalação de um sistema solar, 2 câmeras e 2 pontos de Wi-Fi no canteiro de obra do Jurupari.	CLOSED	NORMAL	275526530904271@lid	Robson	TI - Infraestrutura	Incidente	5977460f-e0d8-4898-8c97-46dd1a53fbd1	2026-02-05 16:54:17.442	2026-02-05 17:48:17.917	2026-02-05 17:48:17.902	RELATÓRIO DE SERVIÇOS – MASSUPIRA\n\nDurante a visita técnica realizada na unidade de Massupira, foram executados os seguintes serviços elétricos, de energia solar e de telecomunicações:\n\nServiços Elétricos\n\t•\tInstalação de 02 lâmpadas no setor de atendimento da cozinha;\n\t•\tInstalação de 02 lâmpadas na cozinha;\n\t•\tInstalação de 02 lâmpadas no refeitório;\n\t•\tInstalação de 01 tomada elétrica para alimentação da televisão;\n\t•\tInstalação de 01 tomada elétrica para alimentação do sistema Starlink;\n\t•\tInstalação de 01 ponto elétrico destinado à torre, para alimentação das câmeras de monitoramento.\n\nSistema Solar / Energia\n\t•\tInstalação e alimentação do sistema solar do EPV;\n\t•\tUtilização de 02 baterias Moura modelo 24MSL100;\n\t•\tInstalação de 01 inversor Epever modelo UP2000-HM6021;\n\t•\tInstalação de barra cobreada destinada ao aterramento do sistema, garantindo maior segurança elétrica.\n\nServiços de Internet e Comunicação\n\t•\tInstalação de uma nova Starlink;\n\t•\tInstalação de 01 ponto de internet no Alojamento 01;\n\t•\tLançamento de aproximadamente 300 metros de fibra óptica, utilizando 04 postes, interligando a rede até o alojamento localizado após o escritório novo;\n\t•\tUtilização de 02 conversores de mídia para a interligação em fibra óptica;\n\t•\tInstalação de 01 roteador no alojamento atendido pela fibra.\n\nMateriais Utilizados\n\t•\tAproximadamente 50 metros de cabo paralelo 1,5 mm², utilizados na confecção das tomadas e parte do circuito elétrico;\n\t•\tAproximadamente 35 metros de cabo PP 3 vias 1,5 mm², utilizados na confecção do circuito elétrico em geral.\n\nTodos os serviços foram executados conforme as necessidades do local, deixando os sistemas elétricos, de energia solar e de comunicação em pleno funcionamento.	software	0	\N	t	\N	\N	\N	SUPPORT
5421ca3f-f87e-41fb-b562-814318906833	12	[Elétrica - Manutenção Geral] Magna - Precisamos de manutenção na il...	Precisamos de manutenção na iluminação, estamos com várias lâmpadas queimadas. Também precisamos que seja finalizada a montagem das mesas e a fixação dos cabos de energia.	CLOSED	NORMAL	107533146550420@lid	Magna	Elétrica - Manutenção Geral	Incidente	\N	2026-02-05 13:10:42.247	2026-02-06 14:41:24.623	2026-02-06 14:41:24.612	teste	usuario	0	\N	t	\N	\N	\N	SUPPORT
657a2ae3-b352-4e89-bbc7-c7328d795090	16	[TI - Hardware] Rayane - Jarbas passou que seria proble...	Jarbas passou que seria problema na rede, pois não está imprimindo, depois que mexeu nos fios parou de imprimir aqui	CLOSED	NORMAL	206373245718763@lid	Rayane	TI - Hardware	TI - Hardware	\N	2026-02-05 16:31:57.561	2026-02-05 18:50:00.934	2026-02-05 18:49:28.075	Cabo de rede desconectado. O próprio rapaz que trabalha no setor, vulgo Marcos, conseguiu fazer a conexão do cabo novamente.	rede	0	\N	f	2026-02-05 18:50:00.932	5	\N	SUPPORT
d4ff27bd-d13f-4fb0-b15e-971b2dce048b	18	[Elétrica - Tomadas] Matheus - Preciso de uma tomada	Preciso de uma tomada	CLOSED	NORMAL	108366688944156@lid	Matheus	Elétrica - Tomadas	Elétrica - Tomadas	\N	2026-02-05 16:58:49.89	2026-02-06 14:41:11.705	2026-02-06 14:41:11.693	teste	usuario	0	\N	t	\N	\N	\N	SUPPORT
cc52a66a-426e-4bfb-8187-458d0c365b8f	19	Relatório de Serviço: Infraestrutura	RELATÓRIO DE SERVIÇOS – CANTEIRO DE OBRAS DO PURUS\n\nDurante a execução dos serviços no Canteiro de Obras do Purus, foram realizadas atividades de infraestrutura de rede, controle de banda, fibra óptica e organização elétrica e lógica, conforme descrito abaixo:\n\n⸻\n\nInfraestrutura de Rede e Equipamentos\n\t•\tInstalação de 01 UCK (Cloud Key – Ubiquiti) para gerenciamento e controle do ambiente UniFi;\n\t•\tInstalação de 01 USG Pro 4 (Ubiquiti) para controle e roteamento da rede;\n\t•\tInstalação de 01 MikroTik modelo RB750, utilizado para controle de banda e políticas de tráfego;\n\t•\tInstalação de 01 switch gerenciável de 24 portas Intelbras modelo 2428TMR;\n\t•\tInstalação de roteadores para atendimento dos blocos/alojamentos, conforme detalhado abaixo.\n\n⸻\n\nDistribuição de Rede por Blocos\n\t•\tBloco 1:\n\t•\tInstalação de aproximadamente 20 metros de cabo de rede;\n\t•\tInstalação de 01 roteador dedicado;\n\t•\tBloco 2:\n\t•\tInstalação de aproximadamente 40 metros de cabo de rede;\n\t•\tInstalação de 01 roteador dedicado;\n\t•\tBloco 3:\n\t•\tInstalação de aproximadamente 50 metros de cabo de rede;\n\t•\tInstalação de 01 roteador dedicado;\n\t•\tBloco 4:\n\t•\tInstalação de aproximadamente 60 metros de cabo de rede;\n\t•\tInstalação de 01 roteador dedicado.\n\n⸻\n\nConfiguração do MikroTik e Controle de Banda\n\t•\tUtilização das portas 2 a 4 do MikroTik RB750 para atendimento dos blocos/alojamentos;\n\t•\tImplementação de controle de banda utilizando encapsulamento PPPoE;\n\t•\tCriação de regras baseadas em tráfego de internet, limitando:\n\t•\t25 Mbps de download\n\t•\t3 Mbps de upload\n\t•\tAs políticas foram aplicadas com o objetivo de evitar saturação da rede corporativa, garantindo melhor desempenho para o escritório dos engenheiros, que apresentava reclamações recorrentes de lentidão.\n\n⸻\n\nFibra Óptica e Interligação com o Escritório\n\t•\tLançamento de aproximadamente 120 metros de fibra óptica, saindo da torre até o escritório;\n\t•\tInstalação de conversor de mídia no escritório;\n\t•\tInterligação realizada a partir da porta 4 do switch Intelbras 24-28TMR;\n\t•\tUtilização de conectores mecânicos de fibra óptica, totalizando 10 unidades.\n\n⸻\n\nVLANs e Políticas de Rede\n\t•\tConfiguração de 03 VLANs no switch gerenciável:\n\t•\tVLAN Alojamento\n\t•\tVLAN Gerenciamento\n\t•\tVLAN Default (VLAN 1)\n\n⸻\n\nLink Alternativo / Sangria de Internet\n\t•\tInstalação de rádio Intelbras, sendo:\n\t•\tUm equipamento 20A MIMO \n\t•\tUm equipamento 15A MIMO no ponto oposto (USINA DE ASFALTO);\n\t•\tConfiguração realizada para fornecer acesso à internet fora da rede corporativa, evitando impacto direto nos sistemas internos;\n\t•\tEquipamento conectado na porta 18 do switch, seguindo as mesmas políticas de controle aplicadas aos blocos/alojamentos.\n\n⸻\n\nOrganização, Revisão e Cabeamento\n\t•\tRevisão completa do quadro localizado na base da torre;\n\t•\tOrganização geral dos equipamentos e materiais instalados;\n\t•\tReorganização e substituição de parte do cabeamento existente;\n\t•\tUtilização aproximada de:\n\t•\t200 metros de cabo de rede;\n\t•\t70 conectores RJ45;\n\t•\t10 conectores mecânicos de fibra óptica.\n\n⸻\n\nTodos os serviços foram executados visando estabilidade da rede, organização da infraestrutura e controle eficiente do tráfego, garantindo melhor desempenho para o escritório administrativo e para os alojamentos.	CLOSED	NORMAL	service-report@system	\N	TI	Incidente	\N	2026-02-05 18:39:36.419	2026-02-05 18:47:54.693	2026-02-05 18:47:54.674	Cabo de rede tava desconectado	software	0	\N	t	\N	\N	\N	SUPPORT
7277e487-10a9-4910-82cc-2094622093ec	20	[TI - Sistemas] Rayane - Movtrans saiu e pedi pro João ...	Movtrans saiu e pedi pro João colocar, porém ele colocou um atalho que não está pegando, aparece "external exception" em qualquer coisa que eu faça, fora que a internet fica caíndo, direto, os fios estão solto, precisa prender.	CLOSED	NORMAL	206373245718763@lid	Rayane	Transporte	Incidente	\N	2026-02-05 20:31:13.783	2026-02-05 21:02:16.114	2026-02-05 21:02:16.087	Cabo de rede estava com defeito, fiz a troca ✅	rede	0	\N	t	\N	\N	\N	SUPPORT
a8e29ff9-c336-4396-842a-f2c11cdfa24b	21	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	140871102156816@lid	Kauã Araújo Silva	T.I	Incidente	\N	2026-02-06 13:36:50.571	2026-02-06 13:37:18.755	2026-02-06 13:37:12.152	Teste	software	0	\N	f	2026-02-06 13:37:18.754	5	\N	SUPPORT
07e2706d-475d-46cb-99c8-84212b12f6e5	22	[TI - Hardware] Auto posto Correntao 2 - Solicito a troca de impressora...	Solicito a troca de impressora do auto posto Correntao 2	CLOSED	NORMAL	66812796477660@lid	Auto posto Correntao 2	Administrativo	TI - Hardware	\N	2026-02-06 18:28:34.539	2026-02-07 12:44:46.804	2026-02-07 12:44:46.769	troca de cilindro	impressora	60	\N	t	\N	\N	\N	SUPPORT
45c501d2-bd09-4d00-b547-7aacefbbf562	23	[TI - Infraestrutura] Raquel - Instabilidade na internet	Instabilidade na internet	CLOSED	NORMAL	154417093419059@lid	Raquel	Caixa	Incidente	\N	2026-02-06 22:49:17.084	2026-02-07 13:22:40.322	2026-02-07 13:22:40.31	Estabilizado.	software	0	\N	t	2026-02-07 13:19:22.114	1	\N	SUPPORT
0cee963f-2918-4052-a47a-8a95289552aa	\N	Relatório de Serviço: Infraestrutura	RELATÓRIO DE SERVIÇOS – CANTEIRO DE OBRAS DO PURUS\n\nDurante a execução dos serviços no Canteiro de Obras do Purus, foram realizadas atividades de infraestrutura de rede, controle de banda, fibra óptica e organização elétrica e lógica, conforme descrito abaixo:\n\n⸻\n\nInfraestrutura de Rede e Equipamentos\n\t•\tInstalação de 01 UCK (Cloud Key – Ubiquiti) para gerenciamento e controle do ambiente UniFi;\n\t•\tInstalação de 01 USG Pro 4 (Ubiquiti) para controle e roteamento da rede;\n\t•\tInstalação de 01 MikroTik modelo RB750, utilizado para controle de banda e políticas de tráfego;\n\t•\tInstalação de 01 switch gerenciável de 24 portas Intelbras modelo 2428TMR;\n\t•\tInstalação de roteadores para atendimento dos blocos/alojamentos, conforme detalhado abaixo.\n\n⸻\n\nDistribuição de Rede por Blocos\n\t•\tBloco 1:\n\t•\tInstalação de aproximadamente 20 metros de cabo de rede;\n\t•\tInstalação de 01 roteador dedicado;\n\t•\tBloco 2:\n\t•\tInstalação de aproximadamente 40 metros de cabo de rede;\n\t•\tInstalação de 01 roteador dedicado;\n\t•\tBloco 3:\n\t•\tInstalação de aproximadamente 50 metros de cabo de rede;\n\t•\tInstalação de 01 roteador dedicado;\n\t•\tBloco 4:\n\t•\tInstalação de aproximadamente 60 metros de cabo de rede;\n\t•\tInstalação de 01 roteador dedicado.\n\n⸻\n\nConfiguração do MikroTik e Controle de Banda\n\t•\tUtilização das portas 2 a 4 do MikroTik RB750 para atendimento dos blocos/alojamentos;\n\t•\tImplementação de controle de banda utilizando encapsulamento PPPoE;\n\t•\tCriação de regras baseadas em tráfego de internet, limitando:\n\t•\t25 Mbps de download\n\t•\t3 Mbps de upload\n\t•\tAs políticas foram aplicadas com o objetivo de evitar saturação da rede corporativa, garantindo melhor desempenho para o escritório dos engenheiros, que apresentava reclamações recorrentes de lentidão.\n\n⸻\n\nFibra Óptica e Interligação com o Escritório\n\t•\tLançamento de aproximadamente 120 metros de fibra óptica, saindo da torre até o escritório;\n\t•\tInstalação de conversor de mídia no escritório;\n\t•\tInterligação realizada a partir da porta 4 do switch Intelbras 24-28TMR;\n\t•\tUtilização de conectores mecânicos de fibra óptica, totalizando 10 unidades.\n\n⸻\n\nVLANs e Políticas de Rede\n\t•\tConfiguração de 03 VLANs no switch gerenciável:\n\t•\tVLAN Alojamento\n\t•\tVLAN Gerenciamento\n\t•\tVLAN Default (VLAN 1)\n\n⸻\n\nLink Alternativo / Sangria de Internet\n\t•\tInstalação de rádio Intelbras, sendo:\n\t•\tUm equipamento 20A MIMO \n\t•\tUm equipamento 15A MIMO no ponto oposto (USINA DE ASFALTO);\n\t•\tConfiguração realizada para fornecer acesso à internet fora da rede corporativa, evitando impacto direto nos sistemas internos;\n\t•\tEquipamento conectado na porta 18 do switch, seguindo as mesmas políticas de controle aplicadas aos blocos/alojamentos.\n\n⸻\n\nOrganização, Revisão e Cabeamento\n\t•\tRevisão completa do quadro localizado na base da torre;\n\t•\tOrganização geral dos equipamentos e materiais instalados;\n\t•\tReorganização e substituição de parte do cabeamento existente;\n\t•\tUtilização aproximada de:\n\t•\t200 metros de cabo de rede;\n\t•\t70 conectores RJ45;\n\t•\t10 conectores mecânicos de fibra óptica.\n\n⸻\n\nTodos os serviços foram executados visando estabilidade da rede, organização da infraestrutura e controle eficiente do tráfego, garantindo melhor desempenho para o escritório administrativo e para os alojamentos.	CLOSED	NORMAL	service-report@system	\N	\N	Infraestrutura	\N	2026-02-05 18:39:36.012	2026-02-07 13:14:42.015	2026-02-07 13:14:41.997	Resolvido 	software	0	\N	t	\N	\N	CANTEIRO DE OBRAS PURUS	SERVICE_REPORT
d9f28841-e333-46b3-9866-b479f2d51af0	26	[TI - Infraestrutura] Italo Nunes - Não sair daqui	Não sair daqui	CLOSED	NORMAL	224412242567390@lid	Italo Nunes	Contabilidade	TI - Infraestrutura	\N	2026-02-09 13:53:16.152	2026-02-09 14:02:50.419	2026-02-09 14:02:50.394	VM reinicializada no pve 126.	software	0	\N	t	\N	\N	\N	SUPPORT
7c58fa06-a74e-4b9e-8723-a6853d0fbe24	24	[TI - Infraestrutura] Caixa - Bom dia\n\nEstamos sem internet ...	Bom dia\n\nEstamos sem internet na rede \nCorrentão clientes	CLOSED	NORMAL	154417093419059@lid	Caixa	Pista	TI - Infraestrutura	\N	2026-02-07 13:21:59.943	2026-02-07 15:24:19.872	2026-02-07 15:19:01.417	Telefone Fixo estava indisponível, solucionado, consequentemente o Wi-Fi subiu.	rede	0	\N	f	2026-02-07 15:24:19.871	5	\N	SUPPORT
a8d5518a-7849-4eae-8359-69f601737e70	25	[TI - Infraestrutura] Lucélia Deocont - sem acesso a áre de trabalho r...	sem acesso a áre de trabalho remota	CLOSED	NORMAL	88390695436525@lid	Lucélia Deocont	contabilidade	Incidente	\N	2026-02-09 13:33:30.882	2026-02-09 13:43:20.909	2026-02-09 13:43:20.895	Inicialização da VM no pve 130.	software	0	\N	t	\N	\N	\N	SUPPORT
75cc2cf7-c1df-4f14-bf9c-0b61cd185738	27	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	34742040809579@lid	karolne, setor financeiro	finaceiro	Incidente	\N	2026-02-09 22:13:04.277	2026-02-10 13:39:46.819	2026-02-10 13:39:46.806	Correção do e-mail e encaminhamento com sucesso.	software	0	\N	t	\N	\N	\N	SUPPORT
8e5c9137-92ff-4748-b873-1bb29de24aba	28	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	224382144262289@lid	Elissandra dias	Contabilidade	Suporte	\N	2026-02-10 00:16:49.174	2026-02-10 13:40:08.631	2026-02-10 13:40:08.62	Reinicialização da VM no PVE 125.	software	0	\N	t	\N	\N	\N	SUPPORT
4c344610-476d-47ce-ac21-3f775ae08df7	29	[Elétrica - Iluminação] Magna - Precisamos de manutenção na il...	Precisamos de manutenção na iluminação, estamos com várias lâmpadas queimadas. Também precisamos que seja finalizada a montagem das mesas e a fixação dos cabos de energia.	NEW	NORMAL	107533146550420@lid	Magna	Engenharia	Incidente	b8f6ec9e-45a9-4566-96ff-ec34003657a5	2026-02-10 14:36:51.078	2026-02-10 14:37:16.581	\N	\N	\N	\N	\N	f	\N	\N	\N	SUPPORT
820ed333-b45b-4b03-8196-c70198aad605	32	[TI - Hardware] Xão - Substituição de impressora par...	Substituição de impressora para impressora nova.	CLOSED	NORMAL	231850924589151@lid	Xão	Controladoria	TI - Hardware	\N	2026-02-10 19:23:33.056	2026-02-10 19:30:53.953	2026-02-10 19:29:58.891	Instalação da impressora colorida no setor controladoria, agendado para amanhã.	impressora	1	\N	f	2026-02-10 19:30:53.952	5	\N	SUPPORT
5dcfc4c4-02cb-4b97-8e26-a2fd26cadfe2	30	[TI - Hardware] Orlan Aguilar - Transformado da impressora A3 ...	Transformado da impressora A3 está com mal contato	CLOSED	NORMAL	12708875341882@lid	Orlan Aguilar	Engenharia	TI - Hardware	\N	2026-02-10 16:30:37.404	2026-02-10 21:56:14.996	2026-02-10 21:56:14.97	Trocamos ó transformador.	software	0	\N	t	\N	\N	\N	SUPPORT
4e27abed-5458-44f4-9afa-51455cb2da96	33	[TI - Administrativo] Eduarda - Preciso de acesso a toda pasta...	Preciso de acesso a toda pasta da engenharia no meu login do servidor. Só tô com acesso a duas pastas	CLOSED	NORMAL	254919328190624@lid	Eduarda	Engenharia	Incidente	\N	2026-02-10 21:39:49.64	2026-02-11 12:58:37.138	2026-02-11 12:58:37.117	Acesso liberado ao usuário conforme solicitado, na pasta:\n\n\\192.168.5.188\\engenharia\\2026\\02 - OBRAS\\01 - DNIT\\02 - PE 006.2025 LTs 1 - 2 - 3A e 3B\n\nOrdem de Serviço finalizada e encerrada.	software	720	\N	t	\N	\N	\N	SUPPORT
5a157e31-16da-4ffa-af1f-816f0b582d0b	31	[TI - Hardware] Siloni - Boa tarde solicito avaliações ...	Boa tarde solicito avaliações tecnicas no computador da balança pedreira pois está apresentando demora nas baixa de arquivos e envios,muita lentidão e travamento dificultando muito a produtividade e a eficácia no atendimento.	CLOSED	NORMAL	134261181050994@lid	Siloni	administrativo	Incidente	d83c9c92-ad36-4ae6-aedd-969c026225db	2026-02-10 18:15:51.8	2026-02-11 13:01:05.045	2026-02-11 13:01:05.022	feito limpeza e atualização. 	software	2	\N	t	\N	\N	\N	SUPPORT
2751b040-e639-46f6-8686-87b8bf741833	34	[TI - Hardware] João - Troca da impressora	Troca da impressora	CLOSED	NORMAL	231850924589151@lid	João	Controladoria	TI - Hardware	\N	2026-02-11 13:33:53.975	2026-02-11 14:48:38.314	2026-02-11 14:48:38.286	Infelizmente os chips que chegaram não são compatíveis com as nossas impressoras, vamos ter que reagendar pro mês que vem, que é o tempo que chega os outros chips. 	impressora	0	\N	t	\N	\N	\N	SUPPORT
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.users (id, email, password, name, role, active, "createdAt", "updatedAt", "glpiGroupId", "glpiUserId", "phoneNumber", "receiveAlerts", "technicianLevel", department, permissions, sector) FROM stdin;
5977460f-e0d8-4898-8c97-46dd1a53fbd1	robson_ssilva26@hotmail.com	$2a$12$ZQGkb4XWGAkT6TSeWEc90OTvKyjjaN49PbpVGxOfcUMajd71sjA12	Robson-ti	AGENT	t	2026-02-04 19:50:35.37	2026-02-08 17:53:02.972	\N	15	132662966677665@lid	t	N1	TI	{dashboard,metricas,relatorios,chat,usuarios,impressoras,bot,faq,estoque,gestao}	TI
982d13c3-acf4-482d-96ed-246ad343be5d	admin@empresa.com	$2a$12$j./qrcjzzCP7BKEAiHRgZu3c35LrCTZYRw6OMmoRI5R0RtIyQbP1q	Administrador	ADMIN	t	2026-02-04 12:22:46.038	2026-02-04 12:22:46.038	\N	\N	\N	t	N1	\N	{}	TI
ae36293d-5338-4197-9e47-36eb81daa55a	kauaa.silva2@gmail.com		Kaua silva	AGENT	t	2026-02-04 14:04:47.953	2026-02-04 14:04:47.953	\N	17	68981044959	t	N1	\N	{}	TI
5f81a952-2c88-4425-bd4d-8719fc7ed83c	matheus.berg.soares@gmail.com	$2a$12$FLL0szEcj0BrGLTfJOQlN.Nhgnyx7ugrZeckG8AxsCVQRHfGGW9N2	matheus-eletrica	AGENT	t	2026-02-02 20:47:23.167	2026-02-09 19:21:50.157	\N	20	69981248816	t	N1	Operações	{dashboard,chat,metricas,relatorios,usuarios,impressoras,bot,faq,estoque,gestao}	TI
b8f6ec9e-45a9-4566-96ff-ec34003657a5	evanilsonsilva1717@gmail.com	$2a$12$IPnv4l0Oc.qUnwSNB9oJuO6sByBrsYJguNGCdmqtACvO1/Ezg4aG.	evanilson-eletrica	AGENT	t	2026-02-09 19:29:24.192	2026-02-09 19:32:39.476	\N	21	75080340111452@lid	t	N1	Operações	{dashboard,chat,metricas,estoque}	TI
a2c7327b-e813-4fcd-96ff-6550e5e4ecb3	araujopedrinho2018@gmail.com	$2a$12$HuyJiTbQtZ09GV21mTZX2.cSNcQZlDwbBykSWAO3DdA2eO43uKuLK	Pedro-ti	AGENT	t	2026-02-04 15:00:22.964	2026-02-10 00:17:36.726	\N	18	62105277448435@lid	t	N1	TI	{dashboard,chat,metricas,faq,bot,impressoras}	TI
f874a603-896e-42d5-8887-e4b78b6fab06	teste	$2a$12$Acu3EGXLXpl7/2htNGIaCeArPVf.EfUejctDxVzpAasCjt78.7rlu	admin-gestao	ADMIN	t	2026-02-10 16:14:24.744	2026-02-10 16:15:33.242	\N	22	99999999999	t	N1		{gestao}	TI
d83c9c92-ad36-4ae6-aedd-969c026225db	matheus-ti@glpi.local	$2a$12$P7FOw6EjVHntmPbfCU//Z.ZPhZWrFLCJsyMhXbjWjYfd77pwnbKyi	matheus-ti	ADMIN	t	2026-02-05 17:00:38.892	2026-02-10 16:20:52.672	\N	11	\N	t	N3	\N	{}	TI
db48567c-8bf7-4d52-ab18-abbf282fbb4f	kaua-ti@glpi.local	$2a$12$3fw7SwElypJ5JtkEwlYmpu67GY.ePabEGdaZcD1XoY94b0kLyPT.W	kaua-ti	AGENT	t	2026-02-04 18:55:39.305	2026-02-11 12:55:41.137	\N	19	140871102156816@lid	t	N1	\N	{}	TI
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: bot_sessions bot_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.bot_sessions
    ADD CONSTRAINT bot_sessions_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: part_usages part_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.part_usages
    ADD CONSTRAINT part_usages_pkey PRIMARY KEY (id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: printers printers_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: queues queues_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_pkey PRIMARY KEY (id);


--
-- Name: report_recipients report_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.report_recipients
    ADD CONSTRAINT report_recipients_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: team_messages team_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.team_messages
    ADD CONSTRAINT team_messages_pkey PRIMARY KEY (id);


--
-- Name: technician_alerts technician_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.technician_alerts
    ADD CONSTRAINT technician_alerts_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: attachments_ticketId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "attachments_ticketId_idx" ON public.attachments USING btree ("ticketId");


--
-- Name: bot_sessions_phoneNumber_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "bot_sessions_phoneNumber_idx" ON public.bot_sessions USING btree ("phoneNumber");


--
-- Name: bot_sessions_phoneNumber_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX "bot_sessions_phoneNumber_key" ON public.bot_sessions USING btree ("phoneNumber");


--
-- Name: contacts_jid_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX contacts_jid_idx ON public.contacts USING btree (jid);


--
-- Name: contacts_jid_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX contacts_jid_key ON public.contacts USING btree (jid);


--
-- Name: contacts_sector_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX contacts_sector_idx ON public.contacts USING btree (sector);


--
-- Name: faqs_keywords_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX faqs_keywords_idx ON public.faqs USING btree (keywords);


--
-- Name: messages_ticketId_createdAt_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "messages_ticketId_createdAt_idx" ON public.messages USING btree ("ticketId", "createdAt" DESC);


--
-- Name: messages_ticketId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "messages_ticketId_idx" ON public.messages USING btree ("ticketId");


--
-- Name: part_usages_ticketId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "part_usages_ticketId_idx" ON public.part_usages USING btree ("ticketId");


--
-- Name: parts_code_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX parts_code_key ON public.parts USING btree (code);


--
-- Name: printers_ip_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX printers_ip_idx ON public.printers USING btree (ip);


--
-- Name: printers_ip_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX printers_ip_key ON public.printers USING btree (ip);


--
-- Name: purchases_category_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX purchases_category_idx ON public.purchases USING btree (category);


--
-- Name: purchases_purchaseDate_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "purchases_purchaseDate_idx" ON public.purchases USING btree ("purchaseDate");


--
-- Name: purchases_sector_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX purchases_sector_idx ON public.purchases USING btree (sector);


--
-- Name: queues_name_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX queues_name_key ON public.queues USING btree (name);


--
-- Name: report_recipients_jid_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX report_recipients_jid_key ON public.report_recipients USING btree (jid);


--
-- Name: reservations_startTime_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "reservations_startTime_idx" ON public.reservations USING btree ("startTime");


--
-- Name: reservations_status_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX reservations_status_idx ON public.reservations USING btree (status);


--
-- Name: reservations_status_startTime_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "reservations_status_startTime_idx" ON public.reservations USING btree (status, "startTime");


--
-- Name: reservations_stockItemId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "reservations_stockItemId_idx" ON public.reservations USING btree ("stockItemId");


--
-- Name: reservations_stockItemId_status_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "reservations_stockItemId_status_idx" ON public.reservations USING btree ("stockItemId", status);


--
-- Name: stock_items_assetStatus_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "stock_items_assetStatus_idx" ON public.stock_items USING btree ("assetStatus");


--
-- Name: stock_items_assetTag_location_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX "stock_items_assetTag_location_key" ON public.stock_items USING btree ("assetTag", location);


--
-- Name: stock_items_category_assetStatus_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "stock_items_category_assetStatus_idx" ON public.stock_items USING btree (category, "assetStatus");


--
-- Name: stock_items_category_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX stock_items_category_idx ON public.stock_items USING btree (category);


--
-- Name: stock_items_code_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX stock_items_code_key ON public.stock_items USING btree (code);


--
-- Name: stock_items_stockType_active_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "stock_items_stockType_active_idx" ON public.stock_items USING btree ("stockType", active);


--
-- Name: stock_items_stockType_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "stock_items_stockType_idx" ON public.stock_items USING btree ("stockType");


--
-- Name: suppliers_name_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX suppliers_name_key ON public.suppliers USING btree (name);


--
-- Name: team_messages_createdAt_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "team_messages_createdAt_idx" ON public.team_messages USING btree ("createdAt");


--
-- Name: team_messages_sector_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX team_messages_sector_idx ON public.team_messages USING btree (sector);


--
-- Name: technician_alerts_ticketId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "technician_alerts_ticketId_idx" ON public.technician_alerts USING btree ("ticketId");


--
-- Name: technician_alerts_userId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "technician_alerts_userId_idx" ON public.technician_alerts USING btree ("userId");


--
-- Name: tickets_createdAt_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "tickets_createdAt_idx" ON public.tickets USING btree ("createdAt" DESC);


--
-- Name: tickets_glpiId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "tickets_glpiId_idx" ON public.tickets USING btree ("glpiId");


--
-- Name: tickets_glpiId_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX "tickets_glpiId_key" ON public.tickets USING btree ("glpiId");


--
-- Name: tickets_phoneNumber_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "tickets_phoneNumber_idx" ON public.tickets USING btree ("phoneNumber");


--
-- Name: tickets_status_assignedToId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "tickets_status_assignedToId_idx" ON public.tickets USING btree (status, "assignedToId");


--
-- Name: tickets_status_createdAt_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "tickets_status_createdAt_idx" ON public.tickets USING btree (status, "createdAt" DESC);


--
-- Name: tickets_status_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX tickets_status_idx ON public.tickets USING btree (status);


--
-- Name: tickets_type_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX tickets_type_idx ON public.tickets USING btree (type);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_role_active_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX users_role_active_idx ON public.users USING btree (role, active);


--
-- Name: attachments attachments_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT "attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: messages messages_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: part_usages part_usages_partId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.part_usages
    ADD CONSTRAINT "part_usages_partId_fkey" FOREIGN KEY ("partId") REFERENCES public.parts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: part_usages part_usages_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.part_usages
    ADD CONSTRAINT "part_usages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchases purchases_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reservations reservations_stockItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT "reservations_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES public.stock_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: team_messages team_messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.team_messages
    ADD CONSTRAINT "team_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: technician_alerts technician_alerts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.technician_alerts
    ADD CONSTRAINT "technician_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tickets tickets_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: helpdesk
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict uvptorWd24iKRcKFg1ldjblI3rdhqtMEQE6lYk6A9WKT7dhODOKq0GLctingrmt

