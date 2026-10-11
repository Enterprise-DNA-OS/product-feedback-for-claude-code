INSERT INTO feedback.boards(id,name) VALUES ('10000000-0000-4000-8000-000000000001','Customer requests') ON CONFLICT DO NOTHING;
INSERT INTO feedback.ideas(id,board_id,title,description,status,owner,effort,reviewed_on,personal_data,purpose,accuracy_review,retention_review) VALUES
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Scheduled export','Send a reviewed monthly extract to finance.','planned','Mere',3,current_date-45,false,'',NULL,NULL),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Branch permissions','Restrict branch records by team.','in-progress','Aroha',5,current_date-5,false,'',NULL,NULL),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Usage digest','Weekly usage totals are ready for acceptance.','complete','Mere',2,current_date,false,'',NULL,NULL),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Contact preference','Fictional personal feedback record for privacy review.','new','',1,NULL,true,'Product research',current_date-5,current_date-2),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','Scheduled export filters','Limit the monthly export to a saved filter.','review','Mere',2,current_date-40,false,'',NULL,NULL)
ON CONFLICT DO NOTHING;
INSERT INTO feedback.accounts(id,name,mrr,renewal_on,segment) VALUES
('30000000-0000-4000-8000-000000000001','Kauri Software',1500,current_date+20,'growth'),
('30000000-0000-4000-8000-000000000002','Harbour Analytics',2200,current_date+50,'enterprise'),
('30000000-0000-4000-8000-000000000003','Tasman Products',900,current_date+120,'growth') ON CONFLICT DO NOTHING;
INSERT INTO feedback.support(idea_id,account_id,evidence) VALUES
('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Demo interview requested monthly delivery'),
('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Demo request from finance lead'),
('20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Demo branch review'),
('20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Demo account acceptance pending') ON CONFLICT DO NOTHING;
INSERT INTO feedback.promises(idea_id,account_id,owner,due_on) VALUES
('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Mere',current_date-7),
('20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Aroha',current_date+14),
('20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Mere',current_date-2) ON CONFLICT DO NOTHING;
