CREATE SCHEMA feedback;
CREATE FUNCTION feedback.touch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE feedback.boards(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE CHECK(length(trim(name))>0), created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE feedback.ideas(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), board_id uuid NOT NULL REFERENCES feedback.boards, title text NOT NULL CHECK(length(trim(title))>0), description text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','review','planned','in-progress','complete','declined')), owner text NOT NULL DEFAULT '', category text NOT NULL DEFAULT '', tags text NOT NULL DEFAULT '',
 effort integer NOT NULL DEFAULT 1 CHECK(effort>0), source_key text UNIQUE, source_status text NOT NULL DEFAULT '', source_votes integer NOT NULL DEFAULT 0 CHECK(source_votes>=0), source_comments integer NOT NULL DEFAULT 0 CHECK(source_comments>=0), source_mrr numeric(14,2), source_row jsonb NOT NULL DEFAULT '{}',
 personal_data boolean NOT NULL DEFAULT false, jurisdiction text NOT NULL DEFAULT 'NZ' CHECK(jurisdiction IN ('NZ','AU','other')), app_entity boolean NOT NULL DEFAULT false, purpose text NOT NULL DEFAULT '', retention_review date, accuracy_review date,
 reviewed_on date, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE feedback.accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE CHECK(length(trim(name))>0), currency text NOT NULL DEFAULT 'NZD' CHECK(currency ~ '^[A-Z]{3}$'), mrr numeric(14,2) NOT NULL DEFAULT 0 CHECK(mrr>=0), renewal_on date, segment text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE feedback.support(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idea_id uuid NOT NULL REFERENCES feedback.ideas, account_id uuid NOT NULL REFERENCES feedback.accounts, evidence text NOT NULL CHECK(length(trim(evidence))>0), UNIQUE(idea_id,account_id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE feedback.promises(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idea_id uuid NOT NULL REFERENCES feedback.ideas,account_id uuid NOT NULL REFERENCES feedback.accounts, owner text NOT NULL CHECK(length(trim(owner))>0),due_on date NOT NULL,state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','fulfilled','withdrawn')),evidence text NOT NULL DEFAULT '', UNIQUE(idea_id,account_id), created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE feedback.notes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idea_id uuid NOT NULL REFERENCES feedback.ideas,actor text NOT NULL,body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE feedback.history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_id uuid, action text NOT NULL,actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE VIEW feedback.attention AS
 SELECT i.id,i.title,i.owner,i.status,concat_ws('; ',CASE WHEN i.owner='' THEN 'unassigned' END,CASE WHEN i.reviewed_on IS NULL OR i.reviewed_on<current_date-30 THEN 'triage review due' END,CASE WHEN EXISTS(SELECT 1 FROM feedback.promises p WHERE p.idea_id=i.id AND p.state='open' AND p.due_on<current_date) THEN 'overdue promise' END) AS reason
 FROM feedback.ideas i WHERE i.status NOT IN ('complete','declined') AND (i.owner='' OR i.reviewed_on IS NULL OR i.reviewed_on<current_date-30 OR EXISTS(SELECT 1 FROM feedback.promises p WHERE p.idea_id=i.id AND p.state='open' AND p.due_on<current_date));
CREATE VIEW feedback.demand AS
 SELECT i.id,i.title,i.status,i.effort,a.currency,count(s.id)::int AS supporting_accounts,sum(a.mrr)::numeric(14,2) AS linked_mrr,round(sum(a.mrr)/i.effort,2) AS mrr_per_effort
 FROM feedback.ideas i JOIN feedback.support s ON s.idea_id=i.id JOIN feedback.accounts a ON a.id=s.account_id GROUP BY i.id,a.currency;
CREATE VIEW feedback.close_loop AS
 SELECT p.id,p.idea_id,i.title,a.name AS account,p.owner,p.due_on FROM feedback.promises p JOIN feedback.ideas i ON i.id=p.idea_id JOIN feedback.accounts a ON a.id=p.account_id WHERE p.state='open' AND i.status='complete';
CREATE VIEW feedback.privacy_checks AS
 SELECT id,title,'NZ-IPP8'::text AS rule,'Accuracy review due; business review schedule'::text AS finding,'https://www.privacy.org.nz/privacy-principles/8/'::text AS source FROM feedback.ideas WHERE personal_data AND jurisdiction='NZ' AND (accuracy_review IS NULL OR accuracy_review<current_date)
 UNION ALL SELECT id,title,'NZ-IPP9','Review necessity and lawful purpose; business review schedule','https://www.privacy.org.nz/privacy-principles/9/' FROM feedback.ideas WHERE personal_data AND jurisdiction='NZ' AND (purpose='' OR retention_review IS NULL OR retention_review<current_date)
 UNION ALL SELECT id,title,'AU-APP11.2','Review disposal or de-identification and exceptions; business review schedule','https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information' FROM feedback.ideas WHERE personal_data AND jurisdiction='AU' AND app_entity AND (purpose='' OR retention_review IS NULL OR retention_review<current_date);
CREATE TRIGGER touch BEFORE UPDATE ON feedback.boards FOR EACH ROW EXECUTE FUNCTION feedback.touch();
ALTER TABLE feedback.boards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback.boards FROM PUBLIC;
CREATE TRIGGER touch BEFORE UPDATE ON feedback.ideas FOR EACH ROW EXECUTE FUNCTION feedback.touch();
ALTER TABLE feedback.ideas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback.ideas FROM PUBLIC;
CREATE TRIGGER touch BEFORE UPDATE ON feedback.accounts FOR EACH ROW EXECUTE FUNCTION feedback.touch();
ALTER TABLE feedback.accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback.accounts FROM PUBLIC;
CREATE TRIGGER touch BEFORE UPDATE ON feedback.support FOR EACH ROW EXECUTE FUNCTION feedback.touch();
ALTER TABLE feedback.support ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback.support FROM PUBLIC;
CREATE TRIGGER touch BEFORE UPDATE ON feedback.promises FOR EACH ROW EXECUTE FUNCTION feedback.touch();
ALTER TABLE feedback.promises ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback.promises FROM PUBLIC;
CREATE TRIGGER touch BEFORE UPDATE ON feedback.notes FOR EACH ROW EXECUTE FUNCTION feedback.touch();
ALTER TABLE feedback.notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback.notes FROM PUBLIC;
CREATE TRIGGER touch BEFORE UPDATE ON feedback.history FOR EACH ROW EXECUTE FUNCTION feedback.touch();
ALTER TABLE feedback.history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback.history FROM PUBLIC;
