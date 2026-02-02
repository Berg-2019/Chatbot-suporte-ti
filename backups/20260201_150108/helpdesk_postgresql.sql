--
-- PostgreSQL database dump
--

\restrict ikap4zx9s262Bb6J28TeYClOGiebspV3sdzhcdRcyDJ9qrixKvmpIZ8HSgFy09L

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
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    rating integer
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
    "technicianLevel" public."TechnicianLevel" DEFAULT 'N1'::public."TechnicianLevel" NOT NULL
);


ALTER TABLE public.users OWNER TO helpdesk;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
b43b3be5-9047-4305-9917-89158269f4c8	034738d8fb4b28b3cc461528f5758b819c4a7835a43f832fdf391bdad0a34705	2026-01-26 13:14:39.114951+00	20260114133809_init	\N	\N	2026-01-26 13:14:39.015184+00	1
b1869891-a809-4197-b8ae-3d2e87bfa2dc	4b587be7b695ab505868268cb78a5d006ee3f21c9f20c10e38650165fe26dd52	2026-01-26 13:14:39.150223+00	20260114202247_add_parts_inventory	\N	\N	2026-01-26 13:14:39.116239+00	1
a8f5f701-033e-41f2-87fa-e45af4adc6c4	fecaa1012a35f2d96c897d25a7a7669ccb40fe95b1025d8a274f8c23de2d4c1f	2026-01-26 13:14:39.165366+00	20260115120446_add_faq	\N	\N	2026-01-26 13:14:39.151419+00	1
3771857d-3ad0-4792-aa4a-8443bfb13f9a	b6492bfba0018de32d4d5f606bd3b9c593bff5168527c777c323ae1be6625e2c	2026-01-26 13:14:39.1932+00	20260115170553_add_technician_levels_and_alerts	\N	\N	2026-01-26 13:14:39.166623+00	1
f9139e99-b822-4847-af8a-64c96f1f50f5	4676f9977b5faffece6f8cf9a3122ef9f2d1b792b02bc4539bb5149c4e8ec947	2026-01-26 13:14:39.198123+00	20260115181140_add_escalated_at	\N	\N	2026-01-26 13:14:39.194219+00	1
f87bb50d-f728-4658-83a9-b380d305621a	a7ff82269733789582d31032bab63224744b4da784f36f6fb3f5764dff439681	2026-01-26 13:14:39.217861+00	20260118220010_add_rating_and_attachments	\N	\N	2026-01-26 13:14:39.199298+00	1
93ff94c6-652d-474b-87d8-ac84489ed9a3	ef2e1c801ce45a66b087c3ee6a01846845ac9195c3f82decf5a8df0cc8fe0867	2026-01-26 13:14:39.23709+00	20260118221720_add_contacts	\N	\N	2026-01-26 13:14:39.219333+00	1
6947426d-9846-436f-98e5-1b6c45cba4ab	e381022af1ccd907d18f880129faab8d1011e150a782b99105633d63e32e1fc7	2026-01-26 13:14:39.254383+00	20260119123547_add_printers	\N	\N	2026-01-26 13:14:39.238219+00	1
6691f39b-8f71-4f88-ac7c-d9a25be23b39	43c2fd6d05e5782ca9729596b4b1a7fc1aa1525322aec99d8b49cf71869b5729	2026-01-26 13:14:39.328586+00	20260126124836_add_report_recipients	\N	\N	2026-01-26 13:14:39.255642+00	1
7444416e-1941-48c1-a899-55ed14fad019	30b3e4201ee74961a5d4d08d7dfdbad94f201929ede3f7f697a56eeb62702bd6	2026-01-28 23:29:41.443368+00	20260128232917_add_stock_and_reservations	\N	\N	2026-01-28 23:29:41.370632+00	1
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
9eed5d5c-e6a4-43e5-a98e-c1c5d54ed930	126087875031102@lid	126087875031102	Matheus	TI - Infraestrutura	Pedreira ti	03	2026-01-27 11:34:31.64	2026-01-27 11:34:31.64
8ffba3e2-343f-498a-bae7-4866ad6f839d	130919344152797@lid	130919344152797	Nicole	Administrativo	Engenheira do CT705		2026-01-28 19:03:09.326	2026-01-28 19:03:09.326
41225e0f-d838-477f-b182-a19fd0189d17	15831383732336@lid	15831383732336	Fabricio	TI - Hardware			2026-01-28 21:52:10.01	2026-01-28 21:52:10.01
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
dace0fa9-d7fb-40c1-9587-9451d2309d47	1b78e03d-47d7-4ad8-9838-2634dd0a1cef	testando	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-26 21:23:08.93
be4f12c3-b9eb-4f00-91e2-c08e7c1b358c	1b78e03d-47d7-4ad8-9838-2634dd0a1cef	Testando user	TEXT	INCOMING	\N	UNKNOWN_WA_ID	2026-01-26 21:23:15.751
57965990-616c-460d-9fea-396275057ab4	1b78e03d-47d7-4ad8-9838-2634dd0a1cef	Testando user	TEXT	INCOMING	\N	UNKNOWN_WA_ID	2026-01-26 21:23:43.648
09e66e5a-f25e-4604-a572-53f11ad57493	1b78e03d-47d7-4ad8-9838-2634dd0a1cef	testando tc	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-26 21:27:31.879
0a52e9d7-e7b1-40b8-bfc5-311a34693339	1b78e03d-47d7-4ad8-9838-2634dd0a1cef	Testando user	TEXT	INCOMING	\N	UNKNOWN_WA_ID	2026-01-26 21:27:44.316
0315e78f-bc96-495a-be55-4f716e5fb3fa	58bc5f98-bf69-41b7-8fbf-37089691201e	testando	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-27 11:20:40.908
ae4c2e0e-6fa7-4315-af13-53457d374f11	58bc5f98-bf69-41b7-8fbf-37089691201e	testando	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-27 11:20:48.145
0299dfe4-5ba6-4cc6-851a-9f6cef082261	58bc5f98-bf69-41b7-8fbf-37089691201e	Teste	TEXT	INCOMING	\N	UNKNOWN_WA_ID	2026-01-27 11:20:58.994
87c325b2-0813-42e3-a2d6-6f2e04c2ed22	b946fa6a-9c8a-48f4-aa9c-1327379286a4	testando	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-27 11:35:35.09
3b4b562b-c4ba-4b95-a8fb-112a093d7e58	b946fa6a-9c8a-48f4-aa9c-1327379286a4	Testando user	TEXT	INCOMING	\N	UNKNOWN_WA_ID	2026-01-27 11:35:44.169
175251a0-2443-469f-afe7-14b1c714e1ce	b946fa6a-9c8a-48f4-aa9c-1327379286a4	testando	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-27 11:47:18.774
17d6024b-1072-4d47-8afd-2391ffeb5ee2	2b2abef0-5256-4da1-b3d7-1e30ca4940db	tesnatndo mensagem	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-27 11:48:35.686
3abba70a-b415-40e5-b272-1996186fd258	2b2abef0-5256-4da1-b3d7-1e30ca4940db	Testando mensagem 2	TEXT	INCOMING	\N	A5AA6D5A85AED9D1AE0803D7E4351730	2026-01-27 11:48:46.168
1f4cc904-8c01-4036-85de-c73b4f1b76d8	2b2abef0-5256-4da1-b3d7-1e30ca4940db	Olá tudo bem	TEXT	INCOMING	\N	A55A95A7D927AF5CAA28F68C8A9233EE	2026-01-27 11:48:53.495
75a14966-3600-4a76-ba8c-cf4cd8113124	2b2abef0-5256-4da1-b3d7-1e30ca4940db	como esta	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-27 11:49:00.369
27735cab-1053-4458-bdd4-21505e2ccc14	bae617d3-36a2-4fb5-a0eb-ac081f180308	Bom dia	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-27 12:55:12.023
a511763e-33ff-4a47-ab10-de07d40b1886	bae617d3-36a2-4fb5-a0eb-ac081f180308	Bom dia	TEXT	INCOMING	\N	3AACDD58CFD33FAC4765	2026-01-27 12:55:26.418
9cf6b108-bd81-4a98-867f-ef6904250278	bae617d3-36a2-4fb5-a0eb-ac081f180308	Testado	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-27 12:56:37.251
ece1ae3d-08e2-4871-9e6b-8df461fe761d	bae617d3-36a2-4fb5-a0eb-ac081f180308	Ok	TEXT	INCOMING	\N	3AEC4FB3CB4CF7DC8559	2026-01-27 12:56:49.121
3d7a5a89-1bbb-4815-9c4f-9401214e1a74	2b2abef0-5256-4da1-b3d7-1e30ca4940db	testando duplicação	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-27 13:01:22.467
8a5834cb-089e-4e47-bdc5-ccee3cf700c5	c46b1064-ca56-4935-bd77-00341a32a96b	ola boa tarde	TEXT	OUTGOING	c598dfdd-c537-44a1-be6b-dda7b84a96e3	\N	2026-01-27 13:28:20.246
e4f348cc-4301-41f1-9806-4ec3a01bb115	c46b1064-ca56-4935-bd77-00341a32a96b	Olá bom dia	TEXT	INCOMING	\N	A5EDA8DD032A6CECF0984D802CB9B10B	2026-01-27 13:28:25.626
32cbd88c-8f1c-4966-94d8-ffc75a9bae71	c46b1064-ca56-4935-bd77-00341a32a96b	Estou com problemas na minha maquina	TEXT	INCOMING	\N	A5EB4FDC02CD25209AACAD66D3380AF1	2026-01-27 13:28:35.687
283f92c4-1ddd-45a3-9d9e-d13a74445cfd	c46b1064-ca56-4935-bd77-00341a32a96b	Teste	TEXT	INCOMING	\N	A56B9F0E6C4335C87B1D09FEC1E4D34F	2026-01-27 13:28:38.233
2d134c6b-b146-49ea-aae6-dd273ac5e297	c46b1064-ca56-4935-bd77-00341a32a96b	Teste	TEXT	INCOMING	\N	A573F10ACF1D1BF0DA2619FF3CA353D0	2026-01-27 13:28:39.356
e5b77bc6-225c-4ed8-9dda-9ef6440180ac	c46b1064-ca56-4935-bd77-00341a32a96b	Teste	TEXT	INCOMING	\N	A5AFB9EE417B6089644A6D6B8F60714E	2026-01-27 13:28:40.536
442296b8-d098-4006-9114-fd12fbc598b2	c46b1064-ca56-4935-bd77-00341a32a96b	Est	TEXT	INCOMING	\N	A5CD179427E0BC5F903DCD7AA268EC68	2026-01-27 13:28:41.843
89696513-a7ac-4a02-a828-8a1bfd6a9073	c46b1064-ca56-4935-bd77-00341a32a96b	ok	TEXT	OUTGOING	c598dfdd-c537-44a1-be6b-dda7b84a96e3	\N	2026-01-27 13:28:48.526
7fac5d89-8ac0-4206-bf46-8421abb6ad99	c46b1064-ca56-4935-bd77-00341a32a96b	teste	TEXT	OUTGOING	c598dfdd-c537-44a1-be6b-dda7b84a96e3	\N	2026-01-27 13:28:50.228
94089b14-2479-4ccf-a247-91318322f455	c46b1064-ca56-4935-bd77-00341a32a96b	teste	TEXT	OUTGOING	c598dfdd-c537-44a1-be6b-dda7b84a96e3	\N	2026-01-27 13:28:52.015
f2b5793f-8eb7-4caf-a2b6-45a21a609798	c46b1064-ca56-4935-bd77-00341a32a96b	Teste	TEXT	INCOMING	\N	A545DEFB341CC6E420526089CA405BFA	2026-01-27 13:29:05.25
20101b52-5bad-468d-80d7-1e9cff97ac48	c46b1064-ca56-4935-bd77-00341a32a96b	Resolvido	TEXT	INCOMING	\N	A592EA0957EE3A7F4D1FB7DAE7D4CDD6	2026-01-27 13:29:41.811
a82c0746-a7b4-4aa5-8982-59e9021b1714	69690a37-03a6-4895-a518-854aadba8208	Ola Gustavo.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-27 15:00:49.41
cf4b4454-4e1f-4af7-86ad-3528715ea552	69690a37-03a6-4895-a518-854aadba8208	Opa	TEXT	INCOMING	\N	ACE7434A64D146294A26B5B678486988	2026-01-27 15:00:57.777
0fb0a88a-9001-42a3-8140-76549d48c4b7	84219f7a-1bc4-42f2-b688-ac7f8fe84237	Opa	TEXT	OUTGOING	7ee59af3-14f6-4f87-8234-1b955747cc17	\N	2026-01-27 15:10:52.615
7d537326-13d4-427a-a911-e42067e7ac18	84219f7a-1bc4-42f2-b688-ac7f8fe84237	Opa	TEXT	INCOMING	\N	AC3B5944BD6231A468ABA1430A1BE23C	2026-01-27 15:10:59.453
76a6033d-3c30-4f80-95d8-d405e16ea306	6a312481-e855-47d3-bc2a-3b44249fe046	opa	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-27 15:13:59.882
d3c0824a-0ec3-4d72-959d-c8b8ab67f1c8	6a312481-e855-47d3-bc2a-3b44249fe046	Opa tranquilo	TEXT	INCOMING	\N	AC1D12BB1095D7E37CD680CF0A708385	2026-01-27 15:14:06.22
a4ddb939-e94c-45a5-8e48-78cbe03936a2	d8f8d0cc-7b61-424d-bd9c-e3a9bae0c664	Olá, Victor. Tudo certo? Recebemos a autorização do Jarbas para a compra do notebook destinado à engenheira do município de Feijó. Iremos dar seguimento ao pedido junto ao Setor de Compras, considerando as necessidades para abertura de planilhas de medição e separação de fotos. Qualquer atualização, avisamos.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 13:16:12.403
e27a2e2f-3560-42b0-ac54-9e7a3a299d86	d8f8d0cc-7b61-424d-bd9c-e3a9bae0c664	Qual o centro de custo?	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 13:38:19.628
3453b277-ae7e-4de1-b456-0a30359288d8	377cb1f2-6c5a-4af5-ba98-5d4a023383b1	bom dia	TEXT	INCOMING	\N	3EB0A35F8DA64D29D8E15B	2026-01-28 15:07:56.524
485ebc36-0d19-4720-8648-e22d738c3ee4	2b7222ca-10e5-4982-8f87-8937d1a52df0	robson já fez	TEXT	INCOMING	\N	3EB0F3B5206CB7408824DE	2026-01-28 15:49:22.496
39eab816-a8de-45ff-a79d-f880a29c4e3b	d8f8d0cc-7b61-424d-bd9c-e3a9bae0c664	Informamos que o notebook já foi comprado e será entregue hoje às 14h. O equipamento atenderá às demandas de abertura de planilhas de medição e separação de fotos.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 16:43:41.718
05b2c07a-9844-48cc-a6e1-35ed3935b70e	9b789f69-ea52-4126-8603-d06fcf400d23	Nicole, teu usuário ficou assim\n\nUs: Nicole (Com N maiúsculo)\nSenha: 23082025@n	TEXT	INCOMING	\N	3A90D651C6F8BBB38404	2026-01-30 18:46:35.043
335f54ed-0a01-491a-b694-aa92388bfaba	9b789f69-ea52-4126-8603-d06fcf400d23	Pode acessar tranquila	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:47:06.095
9b9a52d7-faad-4865-b3ee-7a23a8ebe444	d8f8d0cc-7b61-424d-bd9c-e3a9bae0c664	AVISO IMPORTANTE – USO DE CONTA CORPORATIVA E POLÍTICA DE TI  Informamos que a conta de notebook corporativo possui as seguintes credenciais de acesso:  Conta: engct705@hotmail.com  Senha: 110011Asdf@  ⚠️ ATENÇÃO: Esta conta é exclusiva para uso profissional, destinada somente às atividades da empresa.  Não é permitido:  Utilizar o equipamento ou a conta para atividades pessoais  Acessar ou vincular contas pessoais (e-mail, nuvem, aplicativos, etc.)  Utilizar redes sociais, com exceção apenas do WhatsApp, quando necessário para fins de trabalho  Instalar softwares, aplicativos ou extensões sem autorização  O uso de contas pessoais em equipamentos da empresa só será permitido mediante aprovação prévia da Diretoria.  🔐 LGPD – Lei Geral de Proteção de Dados (Lei nº 13.709/2018)  Reforçamos que:  Todas as informações acessadas, armazenadas ou manipuladas no equipamento podem conter dados pessoais ou sensíveis  O usuário é responsável por manter o sigilo, integridade e uso adequado dessas informações  É proibido compartilhar dados da empresa ou de terceiros sem autorização  Qualquer uso indevido pode gerar responsabilização administrativa, civil e legal, conforme a LGPD e as normas internas da empresa  O descumprimento destas regras poderá resultar em medidas administrativas, incluindo bloqueio de acesso e demais sanções cabíveis.  Em caso de dúvidas ou necessidade de exceção, procure a Diretoria ou o Setor de TI.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 18:10:46.333
6440e128-876d-4252-98d5-9fe0e33cf889	d7579eb1-0ef0-4773-b445-b708390e400e	Olá, Nicole. Boa tarde! A solicitação do notebook foi recebida e já estamos dando andamento. Informamos que o equipamento será disponibilizado em cautela no seu nome. Assim que o processo for finalizado, entraremos em contato para os próximos passos.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 18:55:51.255
fea57b4b-e5f9-469c-bdd1-ba39c9599318	d7579eb1-0ef0-4773-b445-b708390e400e	Olá, Nicole. Boa tarde! Informamos que o notebook já está pronto e disponibilizado. A entrega será realizada exclusivamente ao Max Knoche, que ficará responsável pelo transporte e por levar o equipamento até você. O processo foi finalizado agora e já estamos efetuando a entrega.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 18:58:23.227
6b4058ab-a796-45e2-a7e5-c35df1902a95	d7579eb1-0ef0-4773-b445-b708390e400e	AVISO IMPORTANTE – USO DE CONTA CORPORATIVA E POLÍTICA DE TI  Informamos que a conta de notebook corporativo possui as seguintes credenciais de acesso:  Conta: engct705@hotmail.com  Senha: 110011Asdf@  ⚠️ ATENÇÃO: Esta conta é exclusiva para uso profissional, destinada somente às atividades da empresa.  Não é permitido:  Utilizar o equipamento ou a conta para atividades pessoais  Acessar ou vincular contas pessoais (e-mail, nuvem, aplicativos, etc.)  Utilizar redes sociais, com exceção apenas do WhatsApp, quando necessário para fins de trabalho  Instalar softwares, aplicativos ou extensões sem autorização  O uso de contas pessoais em equipamentos da empresa só será permitido mediante aprovação prévia da Diretoria.  🔐 LGPD – Lei Geral de Proteção de Dados (Lei nº 13.709/2018)  Reforçamos que:  Todas as informações acessadas, armazenadas ou manipuladas no equipamento podem conter dados pessoais ou sensíveis  O usuário é responsável por manter o sigilo, integridade e uso adequado dessas informações  É proibido compartilhar dados da empresa ou de terceiros sem autorização  Qualquer uso indevido pode gerar responsabilização administrativa, civil e legal, conforme a LGPD e as normas internas da empresa  O descumprimento destas regras poderá resultar em medidas administrativas, incluindo bloqueio de acesso e demais sanções cabíveis.  Em caso de dúvidas ou necessidade de exceção, procure a Diretoria ou o Setor de TI.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 19:00:56.172
e6f6ab0c-357f-42ae-963a-56f65f1a3177	d7579eb1-0ef0-4773-b445-b708390e400e	PIN 110011	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 19:01:09.925
ebfa9782-262c-4f0c-88aa-f892ae2f84ae	d8f8d0cc-7b61-424d-bd9c-e3a9bae0c664	OS encerrada. O notebook solicitado foi finalizado, disponibilizado e entregue exclusivamente ao Max Knoche, responsável pelo transporte do equipamento até a solicitante. Com a entrega realizada e o processo concluído, a ordem de serviço está sendo encerrada.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 19:20:58.407
a947f5d0-960e-4ac0-8fe9-8e39e38f9ff5	24cccfe3-cbb7-4c97-b43e-aa2eee37a25d	Boa tarde Fabricio, boa tarde. Já estamos a caminho.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-28 20:48:55.229
61a7a78a-a03a-4ad9-8982-d1c5be24b2a5	871f5a6a-26c9-4e7e-b119-42197c5e52a9	Bom dia. Servidor do domínio reiniciado.	TEXT	OUTGOING	7ee59af3-14f6-4f87-8234-1b955747cc17	\N	2026-01-29 14:57:54.831
344ee89d-e6ee-4ba8-ac57-a80934fb8f1e	7fe06cd4-b036-4394-962c-d51a8f847ab7	ok	TEXT	INCOMING	\N	3EB0DAB5988A8DD584E822	2026-01-29 21:29:10.568
a64b22fd-080a-4a63-a06d-d51b3d4fb141	7fe06cd4-b036-4394-962c-d51a8f847ab7	ola boa tarde	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-29 21:34:48.555
d995a08a-cebd-43df-b915-b6b1891eac7f	7fe06cd4-b036-4394-962c-d51a8f847ab7	em que posso lhe ajudar	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-29 21:34:53.489
12f0dbcf-d4ad-4f66-9d5d-722391e44702	7fe06cd4-b036-4394-962c-d51a8f847ab7	?	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-29 21:37:16.06
8953cf0e-56bf-4117-b4de-0f117c1754a7	7fe06cd4-b036-4394-962c-d51a8f847ab7	OIII	TEXT	INCOMING	\N	3EB062D00A180AD286DA39	2026-01-30 12:34:46.55
321a0189-2090-4ba5-b139-920ae36cba8b	7fe06cd4-b036-4394-962c-d51a8f847ab7	Nossa impressora	TEXT	INCOMING	\N	3EB000D2AF7DB496D204ED	2026-01-30 12:34:49.065
e2e11be5-3ca1-4914-ad50-da8520fc4aaa	7fe06cd4-b036-4394-962c-d51a8f847ab7	estamos sem imprimir	TEXT	INCOMING	\N	3EB09D1752EC1D39327360	2026-01-30 12:34:54.432
2c7f3e2a-ae7d-4c20-b08d-1b6417d6bf70	7fe06cd4-b036-4394-962c-d51a8f847ab7	Bom dia, vi que você está sendo atendida.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-30 12:58:06.58
a18f1b7a-d644-4104-8e7e-2d5432c71160	7fe06cd4-b036-4394-962c-d51a8f847ab7	Bom dia 	TEXT	OUTGOING	7ee59af3-14f6-4f87-8234-1b955747cc17	\N	2026-01-30 13:15:20.564
4152153e-a162-4b15-abe4-1451fa4d8638	7fe06cd4-b036-4394-962c-d51a8f847ab7	Vou tá fechando o chamado devido a conclusão do mesmo 	TEXT	OUTGOING	7ee59af3-14f6-4f87-8234-1b955747cc17	\N	2026-01-30 13:15:44.13
01039687-80b3-4542-bf6f-351147005d35	cc5085b8-a86b-419a-bed6-87b711b3d4d7	OLA BOA TARDE	TEXT	OUTGOING	9433665a-d263-4afd-aac2-e749822b10a3	\N	2026-01-30 16:33:51.6
a6734f22-77a5-41c0-b044-01858fa1e981	9b789f69-ea52-4126-8603-d06fcf400d23	Boa tarde, qual seria o sistema ?	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:44:49.663
5573c749-6d9f-421b-bc06-26510940404d	9b789f69-ea52-4126-8603-d06fcf400d23	Que fica as planilhas das medições	TEXT	INCOMING	\N	3A9BF641E2D8CFD17B15	2026-01-30 18:45:19.831
82a5f2a8-c235-42cf-a9c9-791830d5a258	9b789f69-ea52-4126-8603-d06fcf400d23	Você já tinha até feito meu acesso	TEXT	INCOMING	\N	3A6539D297AD748F8054	2026-01-30 18:45:26.051
0dd65e2a-108a-41f8-92a9-a761dc91ad56	9b789f69-ea52-4126-8603-d06fcf400d23	No caso vc quer o acesso ao servidor? 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:45:57.697
31f6ed9b-8da9-44e3-9a5c-6d14d5d6fa4b	9b789f69-ea52-4126-8603-d06fcf400d23	O acesso eu já tenho só não sei se confio acessar pelo computador novo	TEXT	INCOMING	\N	3AFAFC618D9E1703767F	2026-01-30 18:46:25.441
382f36d4-4286-4ff7-b7d5-b272aa659803	9b789f69-ea52-4126-8603-d06fcf400d23	Você já tem acessa a pasta?	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:47:26.977
278caa70-f49c-4cb6-ac58-0581045db733	9b789f69-ea52-4126-8603-d06fcf400d23	Acesso*	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:47:31.425
e2bcaf91-f665-4223-b00f-8956d69a7953	9b789f69-ea52-4126-8603-d06fcf400d23	Nao	TEXT	INCOMING	\N	3AC43747AAB9D884FF9B	2026-01-30 18:47:36.046
2411f0b6-aadc-4829-a4d3-656672aeb728	9b789f69-ea52-4126-8603-d06fcf400d23	Me passa teu anydesk	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:48:17.666
f5233059-7b54-4601-89fb-f19df812ea69	9b789f69-ea52-4126-8603-d06fcf400d23	Você está em Feijó já? Ou na pedra norte?	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:48:46.473
7805e551-f425-40a0-b668-51f482299f1a	9b789f69-ea52-4126-8603-d06fcf400d23	Feijo	TEXT	INCOMING	\N	3AAF6D8EA54F192E8482	2026-01-30 18:49:21.946
977d2197-d796-43a4-84ba-dab66d12cbfd	9b789f69-ea52-4126-8603-d06fcf400d23	Blz, tô chegando na MSM agora, enquanto isso cê me passa o anydesk	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:54:21.889
d1171c4b-145f-4906-b5cb-4cb4e5dabd5f	9b789f69-ea52-4126-8603-d06fcf400d23	Esse?	TEXT	INCOMING	\N	3A928F988A59879CDD46	2026-01-30 18:54:48.708
0012fcc2-337b-499b-b865-0955ca36d06f	9b789f69-ea52-4126-8603-d06fcf400d23	Isso, no seu notebook tem um aplicativo chamado “anydesk”, cê vai abrir ele e lá vai ter uns números, que vai ser oque eu vou usar pra acessar teu not remotamente 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 18:56:11.873
cccb2ecb-c19a-438e-a61d-4eaa034e3998	9b789f69-ea52-4126-8603-d06fcf400d23	Ok	TEXT	INCOMING	\N	3A8AA88E870B5DBA2B8A	2026-01-30 19:21:39.472
17c41781-f29a-442f-9987-045da3aa75e4	9b789f69-ea52-4126-8603-d06fcf400d23	Na foto de ver né?	TEXT	INCOMING	\N	3A48A5651A5B7B5C6DD5	2026-01-30 19:21:54.366
efb8e118-4160-4630-993b-dac19a1d6f87	9b789f69-ea52-4126-8603-d06fcf400d23	Precisa dele ligado?	TEXT	INCOMING	\N	3A3866DD3FCBE51533BC	2026-01-30 19:37:19.807
41e0a6f8-a8ad-4520-ad2a-c02793153855	9b789f69-ea52-4126-8603-d06fcf400d23	Eu tenho que voltar para o trecho	TEXT	INCOMING	\N	3ADA635A85674287051F	2026-01-30 19:37:26.448
6f8c42d9-3dab-45a2-870f-cbc2c8f2139e	9b789f69-ea52-4126-8603-d06fcf400d23	Precisa estar ligado 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 19:38:10.342
2aa61952-1f13-45a3-8654-2c40b3f03620	9b789f69-ea52-4126-8603-d06fcf400d23	Consegue fazer agora?	TEXT	INCOMING	\N	3A709391F64D73A73F86	2026-01-30 19:39:29.95
4ed19b3e-8782-4d79-88c3-64ec50b952ad	9b789f69-ea52-4126-8603-d06fcf400d23	Consigo 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-30 19:40:43.584
ba74b967-9e25-49a8-9243-e72b3076eedd	e8788afb-80df-419e-bec6-aa99771ecc1b	Opa	TEXT	INCOMING	\N	3A473D7C641655693925	2026-01-30 23:14:34.693
1ec61de0-a0f0-49e5-9616-514e9d24b243	e8788afb-80df-419e-bec6-aa99771ecc1b	Queria solicitar um notebook pra eu trabalhar aqui do interior	TEXT	INCOMING	\N	3A466D32ED6927A3A12A	2026-01-30 23:15:03.044
16120fb9-81bf-4276-8f08-1ee86e066a51	9f617dfc-723f-4e8f-88bd-dde2611c55f3	Qual sistema?	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-31 00:55:34.294
ece804d6-3c20-41fc-b5b3-a73409ba8a0d	a6af9df8-8560-49fa-bae8-095358785c4c	Vou passar esse feedback pro meu pai, pode deixar	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-31 00:56:06.826
47f01390-2c17-4b14-bdab-82f5eb27cbfd	e8788afb-80df-419e-bec6-aa99771ecc1b	Boa noite mano 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-31 00:56:23.813
61e5db3a-2023-4314-b8ea-490cbafead30	e8788afb-80df-419e-bec6-aa99771ecc1b	Tem que ser solicitado diretamente com o Jarbas, só ele libera esse tipo de coisa 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-31 00:56:48.673
8dc57fdf-0920-4732-8db1-ecadc69b1a53	e8788afb-80df-419e-bec6-aa99771ecc1b	Boa noite, mano	TEXT	INCOMING	\N	3A3413C51C538397775B	2026-01-31 00:59:21.531
cb809adb-5629-468c-b1a4-968a351927a4	e8788afb-80df-419e-bec6-aa99771ecc1b	A questão do notebook ou da internet?	TEXT	INCOMING	\N	3AE6122E9E5B8BA80FD6	2026-01-31 00:59:29.408
f39a5637-63f6-4945-84c4-6752c817abb4	e8788afb-80df-419e-bec6-aa99771ecc1b	Bom dia. Estou  a caminho	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-31 12:20:41.987
bd4952ff-858d-4a27-8125-e384f5381be6	a6af9df8-8560-49fa-bae8-095358785c4c	Estou a caminho 	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-31 12:21:29.471
16026c25-dc6e-43f1-9ee7-9b2f8dc84305	458142be-4ef4-462a-a9a0-f351a388fffe	Bom dia, vou repassar para os meninos.	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-31 13:32:29.216
2f39c75b-73fe-4cc2-ae20-a88c1612ccde	e99227f1-6fc0-404f-a794-99a43db7912c	2	TEXT	INCOMING	\N	3EB02FB328664586102B37	2026-01-31 14:28:09.462
fda2e3fa-0c58-49d0-9472-9ed929a319e3	e99227f1-6fc0-404f-a794-99a43db7912c	Bom dia	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-01-31 14:46:05.698
f255bbd0-3ef4-4b1b-9d97-e75875ad0a85	e99227f1-6fc0-404f-a794-99a43db7912c	Bom dia, gostaria de solicitar a conclusão da demanda de fixação das mesas e dos fios no setor de engenharia.	TEXT	INCOMING	\N	3EB0F708D0A440FAD1D6F3	2026-01-31 14:47:48.972
16bd9c5a-2c42-4c9a-8371-5aa160b50dc2	3ff3ae0a-dfd3-4a88-96fd-65b03315d00a	Opa, na hora 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-31 16:38:00.439
0f0f3f16-7a15-4fc5-878d-5fd1598b4f4d	e99227f1-6fc0-404f-a794-99a43db7912c	Bom dia, provavelmente eu consiga ir segunda feira. Finalizamos algumas demandas que estavam mais urgente, comentei até com a Magna sobre isso 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-31 16:39:08.435
675f61e1-e6cc-4227-9dc9-eaafe08851f6	e99227f1-6fc0-404f-a794-99a43db7912c	Vai dar certo 	TEXT	OUTGOING	daa9f772-cfff-48d4-8e70-1be9f130f2a5	\N	2026-01-31 16:39:24.817
3dbf3f31-4673-4ee5-9cd7-06a266f34613	a6af9df8-8560-49fa-bae8-095358785c4c	Boa noite, após verificar a situação no local identificamos que o problema era a interface da starlink com intermitência. Logo após isso, entrei em contato com o Gustavo e solicitei que ele mandasse com urgência a starlink reserva q está na Pedra Norte. 	TEXT	OUTGOING	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	\N	2026-02-01 06:13:23.082
\.


--
-- Data for Name: part_usages; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.part_usages (id, "ticketId", "partId", "partName", quantity, "unitCost", purchased, "createdAt") FROM stdin;
b32ea3ef-f733-435c-87e7-d6d5a174cb91	d7579eb1-0ef0-4773-b445-b708390e400e	cd4b3743-35f4-454b-8639-dc8a3c8ef7c2	NOTEBOOK 16,6``	1	2499.00	f	2026-01-28 19:03:09.298
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.parts (id, name, code, description, quantity, "minQuantity", "unitCost", active, "createdAt", "updatedAt") FROM stdin;
28b2eee8-006f-4163-91b9-1bad7c27528c	1 LITRO DE TINTA COR PRETO	EU1000-01LB	Este produto  vai ser usado para completar os reservatorios de tinta preta das impressoras CANON.	1	5	123.00	t	2026-01-26 20:41:04.705	2026-01-26 20:42:32.14
19201b9b-9f3e-4719-923e-ca9a474c567a	1 LITRO DE TINTA AMARELA	EU1000-01LY	Este produto  vai ser usado para completar os reservatorios de tinta AMARELA das impressoras CANON.	3	5	123.00	t	2026-01-26 20:45:05.959	2026-01-26 20:45:13.611
c50e5fb0-e1f2-4f13-afc5-874ccf938119	1 LITRO DE TINTA AZUL	EU1000-01LC	Este produto  vai ser usado para completar os reservatorios de tinta AZUL  das impressoras CANON.	1	5	123.00	t	2026-01-26 20:43:55.639	2026-01-26 20:45:28.11
2756f25a-705f-45af-a0e5-8336dd4b3573	1 LITRO DE TINTA COR VERMELHO	EU1000-01LM	Este produto  vai ser usado para completar os reservatorios de tinta VERMELHA das impressoras CANON.	1	5	123.00	t	2026-01-26 20:42:18.548	2026-01-26 20:45:39.379
2104c40d-245b-4725-a038-99f42aa61bc3	Conversor DP/HDMI	8434	Para Usar na instalação dos novos monitores. ABS: os novos monitores não contém a porta de DP.	1	5	49.00	t	2026-01-26 19:56:28.491	2026-01-27 14:42:06.061
cd4b3743-35f4-454b-8639-dc8a3c8ef7c2	NOTEBOOK 16,6``	1545/3575	4G DE RAM/ 128GB SSD/ WIN11/ OFFICE 365 1 ANO	0	5	2499.00	t	2026-01-28 18:28:06.58	2026-01-28 19:03:09.315
\.


--
-- Data for Name: printers; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.printers (id, name, ip, community, model, "serialNumber", location, "lastStatus", "lastTonerBlack", "lastTonerCyan", "lastTonerMagenta", "lastTonerYellow", "lastPageCount", "lastCheckedAt", active, "createdAt", "updatedAt") FROM stdin;
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
52b33951-a125-4ca2-9c2c-9fda0fa4e6c2	matheus	108366688944156@lid	t	2026-01-26 15:07:01.935
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.reservations (id, "stockItemId", "userId", "userName", "userPhone", "userSector", "startTime", "endTime", status, "ticketId", notes, "approvedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.stock_items (id, name, code, description, "stockType", category, quantity, "minQuantity", unit, "unitCost", location, "printerModel", "inkColor", "assetTag", "assetStatus", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.suppliers (id, name, cnpj, phone, email, address, active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: team_messages; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.team_messages (id, content, "senderId", "createdAt") FROM stdin;
74e5b93d-66d3-4555-9ac2-8479f60b6642	ola	9433665a-d263-4afd-aac2-e749822b10a3	2026-01-26 14:16:48.036
ea93d072-b7e3-49c9-9004-26fda678f929	teste	9433665a-d263-4afd-aac2-e749822b10a3	2026-01-26 14:46:01.069
5aa0fd74-00ea-4604-b40e-17be457c899b	ola	7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	2026-01-26 20:26:34.781
0f0ef2db-c45b-4bfc-b496-89c29f9c9a2c	sistema de comunicação usuario - tecnico ajustado	9433665a-d263-4afd-aac2-e749822b10a3	2026-01-26 21:27:21.343
f3741175-6fb4-40a0-961b-c6692bde8e49	testando 123	c598dfdd-c537-44a1-be6b-dda7b84a96e3	2026-01-27 13:30:43.535
\.


--
-- Data for Name: technician_alerts; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.technician_alerts (id, "userId", "ticketId", "glpiId", type, message, "sentViaWa", "sentViaPush", "readAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.tickets (id, "glpiId", title, description, status, priority, "phoneNumber", "customerName", sector, category, "assignedToId", "createdAt", "updatedAt", "closedAt", solution, "solutionType", "timeWorked", "escalatedAt", "awaitingRating", "ratedAt", rating) FROM stdin;
1b78e03d-47d7-4ad8-9838-2634dd0a1cef	8	[TI - Infraestrutura] Chamado via WhatsApp	Teste	CLOSED	NORMAL	108366688944156@lid	Matheus	TI - Infraestrutura	Incidente	\N	2026-01-26 21:22:54.998	2026-01-26 21:30:52.148	2026-01-26 21:30:52.13	teste		0	\N	t	\N	\N
58bc5f98-bf69-41b7-8fbf-37089691201e	9	[TI - Infraestrutura] Chamado via WhatsApp	Teste	CLOSED	NORMAL	126087875031102@lid	Teste	TI - Infraestrutura	Incidente	\N	2026-01-27 11:20:22.925	2026-01-27 11:34:31.647	2026-01-27 11:34:31.622	teste		0	\N	t	\N	\N
b946fa6a-9c8a-48f4-aa9c-1327379286a4	10	[TI - Infraestrutura] Chamado via WhatsApp	Teste	CLOSED	NORMAL	126087875031102@lid	Matheus	TI - Infraestrutura	TI - Infraestrutura	\N	2026-01-27 11:35:16.292	2026-01-27 11:47:43.862	2026-01-27 11:47:43.851	teste		0	\N	t	\N	\N
bae617d3-36a2-4fb5-a0eb-ac081f180308	12	[TI - Infraestrutura] Chamado via WhatsApp	Teste	CLOSED	NORMAL	132662966677665@lid	Robson	TI - Infraestrutura	TI - Infraestrutura	\N	2026-01-27 12:54:21.204	2026-01-27 12:57:33.414	2026-01-27 12:57:33.403	Teste	Outro	0	\N	t	\N	\N
2b2abef0-5256-4da1-b3d7-1e30ca4940db	11	[TI - Infraestrutura] Chamado via WhatsApp	Teste	CLOSED	NORMAL	126087875031102@lid	Matheus	TI - Infraestrutura	Incidente	\N	2026-01-27 11:48:22.726	2026-01-27 13:13:25.544	2026-01-27 13:13:25.522	fechar teste		0	\N	t	\N	\N
c46b1064-ca56-4935-bd77-00341a32a96b	13	[TI - Infraestrutura] Chamado via WhatsApp	Teste	CLOSED	NORMAL	126087875031102@lid	Matheus	TI - Infraestrutura	Incidente	c598dfdd-c537-44a1-be6b-dda7b84a96e3	2026-01-27 13:27:53.693	2026-01-27 13:30:15.95	2026-01-27 13:30:15.938	teste7		0	\N	t	\N	\N
2d18a5db-738c-4f75-b92a-0306ef0233d5	14	[TI - Infraestrutura] Chamado via WhatsApp	Teste	CLOSED	NORMAL	126087875031102@lid	Matheus	TI - Infraestrutura	TI - Infraestrutura	c598dfdd-c537-44a1-be6b-dda7b84a96e3	2026-01-27 13:33:50.481	2026-01-27 14:58:36.148	2026-01-27 14:58:36.132	teste de funcionamento do app\n		0	\N	t	\N	\N
377cb1f2-6c5a-4af5-ba98-5d4a023383b1	19	[TI - Hardware] kézia monteiro - manutenção cartucho impressora...	manutenção cartucho impressora ADM	CLOSED	NORMAL	15831383732336@lid	kézia monteiro	TI - Hardware	TI - Hardware	7ee59af3-14f6-4f87-8234-1b955747cc17	2026-01-28 15:07:30.88	2026-01-28 15:46:37.665	2026-01-28 15:46:37.655	Chip do cartucho de manutenção foi devidamente resetado.		0	\N	t	\N	\N
84219f7a-1bc4-42f2-b688-ac7f8fe84237	16	[TI - Infraestrutura] Gustavo cesar - Sem rede	Sem rede	CLOSED	NORMAL	85457115328581@lid	Gustavo cesar	TI - Infraestrutura	TI - Infraestrutura	7ee59af3-14f6-4f87-8234-1b955747cc17	2026-01-27 15:10:29.575	2026-01-27 15:11:38.544	2026-01-27 15:11:38.534	Teste	Rede	0	\N	t	\N	\N
69690a37-03a6-4895-a518-854aadba8208	15	[TI - Hardware] Gustavo cesar - Sem rede	Sem rede	CLOSED	NORMAL	85457115328581@lid	Gustavo cesar	TI - Hardware	Incidente	7ee59af3-14f6-4f87-8234-1b955747cc17	2026-01-27 14:59:49.599	2026-01-27 15:12:41.234	2026-01-27 15:12:41.225	teste	Rede	0	\N	t	\N	\N
6a312481-e855-47d3-bc2a-3b44249fe046	17	[TI - Infraestrutura] Gustavo César - Falta de rede no computador	Falta de rede no computador	CLOSED	NORMAL	85457115328581@lid	Gustavo César	TI - Infraestrutura	Incidente	\N	2026-01-27 15:13:33.387	2026-01-27 15:21:47.935	2026-01-27 15:21:47.922	test\n	Rede	0	\N	t	\N	\N
2b7222ca-10e5-4982-8f87-8937d1a52df0	20	[TI - Hardware] kézia monteiro - correção cabo do pc aprendiz	correção cabo do pc aprendiz	CLOSED	NORMAL	15831383732336@lid	kézia monteiro	TI - Hardware	TI - Hardware	7ee59af3-14f6-4f87-8234-1b955747cc17	2026-01-28 15:49:13.655	2026-01-28 16:27:39.706	2026-01-28 16:27:39.695	Cabo confeccionado.		0	\N	t	\N	\N
d7579eb1-0ef0-4773-b445-b708390e400e	21	[Administrativo] Nicole - Boa tarde, me chamo Nicole, so...	Boa tarde, me chamo Nicole, sou engenheira do lote 06, CT 705-2024. Gostaria de abrir uma ordem de serviço solicitando um notebook.	CLOSED	NORMAL	130919344152797@lid	Nicole	Administrativo	Incidente	\N	2026-01-28 18:48:40.539	2026-01-28 19:03:09.337	2026-01-28 19:03:09.277	OS encerrada.\nO notebook solicitado foi finalizado, disponibilizado e entregue exclusivamente ao Max Knoche, responsável pelo transporte do equipamento até a solicitante.\nCom a entrega realizada e o processo concluído, a ordem de serviço está sendo encerrada.	Hardware	0	\N	t	\N	\N
d8f8d0cc-7b61-424d-bd9c-e3a9bae0c664	18	[Administrativo] Victor Moreira - Jarbas autorizou a compra de u...	Jarbas autorizou a compra de um notebook para a engenheira que fica no município de Feijó.\nO notebook precisa atender as demandas de abrir as planilhas de medição e separação de fotos.	CLOSED	NORMAL	169870285111400@lid	Victor Moreira	Administrativo	Administrativo	7ee59af3-14f6-4f87-8234-1b955747cc17	2026-01-28 13:10:46.094	2026-01-28 19:21:48.733	2026-01-28 19:21:48.712	OS encerrada.\nO notebook solicitado foi finalizado, disponibilizado e entregue exclusivamente ao Max Knoche, responsável pelo transporte do equipamento até a solicitante.\nCom a entrega realizada e o processo concluído, a ordem de serviço está sendo encerrada.	Hardware	0	\N	t	\N	\N
24cccfe3-cbb7-4c97-b43e-aa2eee37a25d	22	[TI - Hardware] Fabríco Henrique - A impressora prendeu o pepel e...	A impressora prendeu o pepel em seu interior, impossibilitando a retirada pela tampa traseira.	CLOSED	NORMAL	15831383732336@lid	Fabríco Henrique	TI - Hardware	TI - Hardware	7ee59af3-14f6-4f87-8234-1b955747cc17	2026-01-28 20:07:35.815	2026-01-28 21:52:10.022	2026-01-28 21:52:09.97	OS finalizada.\nFoi identificado e removido um papel que estava causando atolamento e congestionamento das impressões na impressora da Administração do Corretão, localizada na sala do Administrativo.\nApós a intervenção, o equipamento foi testado e encontra-se funcionando normalmente.	Outro	0	\N	t	\N	\N
871f5a6a-26c9-4e7e-b119-42197c5e52a9	23	[TI - Sistemas] Ellyan - Bom dia, não consigo acessar a...	Bom dia, não consigo acessar a Domínio.	CLOSED	NORMAL	99330061017183@lid	Ellyan	TI - Sistemas	Incidente	7ee59af3-14f6-4f87-8234-1b955747cc17	2026-01-29 14:01:16.915	2026-01-29 14:59:51.062	2026-01-29 14:59:51.046	Reinicialização do Servidor do Domínio.	Outro	0	\N	t	\N	\N
7fe06cd4-b036-4394-962c-d51a8f847ab7	24	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	21028294135913@lid	Cliente	Atendimento	Suporte	7ee59af3-14f6-4f87-8234-1b955747cc17	2026-01-29 21:28:15.644	2026-01-30 13:16:21.599	2026-01-30 13:16:21.588	Recarga da tinta preta 	Outro	0	\N	t	\N	\N
9b789f69-ea52-4126-8603-d06fcf400d23	26	[TI - Hardware] Nicole - Eu peguei o computador e quero...	Eu peguei o computador e quero ajuda para por o sistema	IN_PROGRESS	NORMAL	130919344152797@lid	Nicole	TI - Hardware	TI - Hardware	daa9f772-cfff-48d4-8e70-1be9f130f2a5	2026-01-30 18:23:19.467	2026-01-30 18:44:29.141	\N	\N	\N	\N	\N	f	\N	\N
a6af9df8-8560-49fa-bae8-095358785c4c	28	[TI - Infraestrutura] Orlan Aguilar - Melhor a internet do canteiro ...	Melhor a internet do canteiro do Purus, ao ponto de conseguir baixar as fotos do WhatsApp e organizar no servidor	IN_PROGRESS	NORMAL	12708875341882@lid	Orlan Aguilar	TI - Infraestrutura	TI - Infraestrutura	daa9f772-cfff-48d4-8e70-1be9f130f2a5	2026-01-30 22:51:24.625	2026-01-31 00:55:38.967	\N	\N	\N	\N	\N	f	\N	\N
cc5085b8-a86b-419a-bed6-87b711b3d4d7	25	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	15831383732336@lid	Cliente	Atendimento	Incidente	daa9f772-cfff-48d4-8e70-1be9f130f2a5	2026-01-30 15:24:32.792	2026-01-31 16:45:46.983	2026-01-31 16:45:46.974	Teste		0	\N	t	\N	\N
458142be-4ef4-462a-a9a0-f351a388fffe	30	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	132662966677665@lid	Cliente	Atendimento	Suporte	\N	2026-01-31 12:23:58.295	2026-01-31 13:33:21.175	2026-01-31 13:33:21.165	Teste	Outro	0	\N	t	\N	\N
3ff3ae0a-dfd3-4a88-96fd-65b03315d00a	32	[TI - Infraestrutura] Alexandre - O sistema blue precise que rei...	O sistema blue precise que reinicie o servidor	CLOSED	NORMAL	36597600915675@lid	Alexandre	TI - Infraestrutura	TI - Infraestrutura	daa9f772-cfff-48d4-8e70-1be9f130f2a5	2026-01-31 15:58:44.728	2026-01-31 16:40:12.836	2026-01-31 16:40:12.825	Reiniciando o servidor já resolveu. O problema era lentidão e algumas travadas 		0	\N	t	\N	\N
e99227f1-6fc0-404f-a794-99a43db7912c	31	Falar com Técnico	Solicitação direta de atendimento humano via menu do bot.	CLOSED	NORMAL	107533146550420@lid	Cliente	Atendimento	Incidente	daa9f772-cfff-48d4-8e70-1be9f130f2a5	2026-01-31 13:48:27.522	2026-01-31 16:41:01.037	2026-01-31 16:41:01.025	Fixação das mesas, agendado para dia 02/02/2026	Instalação	0	\N	t	\N	\N
e8788afb-80df-419e-bec6-aa99771ecc1b	29	[TI - Infraestrutura] Jeferson Kaiser - Quero abrir um chamado pra mel...	Quero abrir um chamado pra melhorar a internet do Purus. Chegou a um ponto que a sala técnica às vezes não consegue baixar fotos pelo computador. \n\nSendo que é a parte mais importante das maiores medições da empresa.	CLOSED	NORMAL	258295071781074@lid	Jeferson Kaiser	TI - Infraestrutura	Incidente	daa9f772-cfff-48d4-8e70-1be9f130f2a5	2026-01-30 23:02:33.27	2026-01-31 16:42:33.366	2026-01-31 16:42:33.352	Solicitação de notebook, não podemos resolver essa questão sem antes ter a permissão do Sr Jarbas.	Outro	0	\N	t	\N	\N
9f617dfc-723f-4e8f-88bd-dde2611c55f3	27	[TI - Sistemas] Denise - Sistema lento	Sistema lento	CLOSED	NORMAL	154417093419059@lid	Denise	TI - Sistemas	Incidente	daa9f772-cfff-48d4-8e70-1be9f130f2a5	2026-01-30 21:47:40.573	2026-01-31 16:44:44.58	2026-01-31 16:44:44.571	Tivemos a breve reclamação de que o sistema está lento, porém, não teve retorno explicando qual sistema está lento.	Outro	0	\N	t	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: helpdesk
--

COPY public.users (id, email, password, name, role, active, "createdAt", "updatedAt", "glpiGroupId", "glpiUserId", "phoneNumber", "receiveAlerts", "technicianLevel") FROM stdin;
9433665a-d263-4afd-aac2-e749822b10a3	matheus-ti@glpi.local	$2a$12$CBH2NZ01d4e/lSHK0e1zteryxzpX/.fi8d/bVP/qQfiC1XoTja1eK	matheus soares	ADMIN	t	2026-01-26 14:06:14.923	2026-01-28 16:17:15.878	\N	7	69981248816	t	N3
7b2c6f6b-0c39-46fd-9927-c8ff6649aeb3	robson_ssilva26@hotmail.com		Robson-ti	ADMIN	t	2026-01-26 14:14:10.802	2026-01-28 16:39:11.83	\N	8	68984268042	t	N3
7ee59af3-14f6-4f87-8234-1b955747cc17	kauaa.silva2@gmail.com		kaua-ti	AGENT	t	2026-01-26 14:16:36.816	2026-01-31 16:38:04.74	\N	10	68981044959	t	N1
41ff7a72-136d-445e-a772-277a30476c91	admin@empresa.com	$2a$12$UOavXO3jszeDUCx9tbUVaeQHccONc/5n4BtIfdY0JjZA6N0Zw6e/6	Administrador	ADMIN	t	2026-01-26 15:07:41.045	2026-01-26 15:07:41.045	\N	\N	\N	t	N1
daa9f772-cfff-48d4-8e70-1be9f130f2a5	Araujopedrinho2018@gmail.com		Pedro-ti	AGENT	t	2026-01-26 14:15:21.829	2026-01-27 14:44:52.995	\N	9	68984170484	t	N1
c598dfdd-c537-44a1-be6b-dda7b84a96e3	matheus-ti2@glpi.local		matheus-ti2	AGENT	t	2026-01-27 13:26:49.779	2026-01-27 14:45:05.053	\N	11	\N	t	N1
f7860ef1-1b32-4234-a923-1b8e26941eb6	admi-nene@glpi.local		admi-nene	ADMIN	t	2026-01-27 15:19:17.24	2026-01-27 15:19:37.433	\N	12	68999851231	t	N3
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
-- Name: reservations_stockItemId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "reservations_stockItemId_idx" ON public.reservations USING btree ("stockItemId");


--
-- Name: stock_items_assetStatus_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "stock_items_assetStatus_idx" ON public.stock_items USING btree ("assetStatus");


--
-- Name: stock_items_assetTag_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX "stock_items_assetTag_key" ON public.stock_items USING btree ("assetTag");


--
-- Name: stock_items_category_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX stock_items_category_idx ON public.stock_items USING btree (category);


--
-- Name: stock_items_code_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX stock_items_code_key ON public.stock_items USING btree (code);


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
-- Name: technician_alerts_ticketId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "technician_alerts_ticketId_idx" ON public.technician_alerts USING btree ("ticketId");


--
-- Name: technician_alerts_userId_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX "technician_alerts_userId_idx" ON public.technician_alerts USING btree ("userId");


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
-- Name: tickets_status_idx; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE INDEX tickets_status_idx ON public.tickets USING btree (status);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: helpdesk
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


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

\unrestrict ikap4zx9s262Bb6J28TeYClOGiebspV3sdzhcdRcyDJ9qrixKvmpIZ8HSgFy09L

