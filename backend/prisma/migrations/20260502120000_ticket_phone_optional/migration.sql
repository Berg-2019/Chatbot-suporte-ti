-- Tornar Ticket.phoneNumber opcional (tickets criados via web/painel não têm telefone)
ALTER TABLE "tickets" ALTER COLUMN "phoneNumber" DROP NOT NULL;
