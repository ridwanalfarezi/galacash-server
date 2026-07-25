-- GalaCash accesses PostgreSQL only from the trusted backend connection.
-- RLS without public policies prevents accidental Data API exposure while
-- the backend's postgres connection continues to operate as the table owner.
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fund_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_accounts" ENABLE ROW LEVEL SECURITY;
