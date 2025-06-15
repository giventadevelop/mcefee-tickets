-- SAMPLE INSERTS FOR ALL TABLES IN GIVENTA EVENT MANAGEMENT SCHEMA
-- This script populates every table with at least 6 rows of sample data.
-- Enum/lookup values are used where appropriate. Foreign key dependencies are respected.

-- 1. discount_code (parent for event_discount_code, event_ticket_transaction)
INSERT INTO public.discount_code (id, code, description, discount_type, discount_value, max_uses, uses_count, valid_from, valid_to, is_active, created_at, updated_at)
VALUES
(1, 'SPRING10', '10% off Spring events', 'PERCENT', 10.00, 100, 5, '2025-03-01', '2025-06-01', true, now(), now()),
(2, 'VIP50', '50% off for VIPs', 'PERCENT', 50.00, 10, 2, '2025-04-01', '2025-08-01', true, now(), now()),
(3, 'FREERUN', 'Free entry for Charity Run', 'AMOUNT', 100.00, 50, 10, '2025-05-01', '2025-06-02', true, now(), now()),
(4, 'EARLYBIRD', 'Early bird discount', 'PERCENT', 20.00, 200, 20, '2025-01-01', '2025-04-10', true, now(), now()),
(5, 'SUMMERFEST', 'Summer Fest special', 'PERCENT', 15.00, 150, 15, '2025-07-01', '2025-08-16', true, now(), now()),
(6, 'FAMILY5', 'Family Picnic 5% off', 'PERCENT', 5.00, 50, 3, '2025-07-01', '2025-07-21', true, now(), now());

-- 22. event_type_details (parent for event_details)
INSERT INTO public.event_type_details (id, tenant_id, name, description, is_active, created_at, updated_at)
VALUES
(1, 'tenant_demo_001', 'Gala', 'Formal gala event', true, now(), now()),
(2, 'tenant_demo_001', 'Conference', 'Tech conference', true, now(), now()),
(3, 'tenant_demo_001', 'Run', 'Charity run', true, now(), now()),
(4, 'tenant_demo_001', 'Picnic', 'Family picnic', true, now(), now()),
(5, 'tenant_demo_001', 'Dinner', 'VIP dinner', true, now(), now()),
(6, 'tenant_demo_001', 'Festival', 'Summer festival', true, now(), now());
-- 2. user_profile (parent for user_subscription, event_attendee, etc.)
INSERT INTO public.user_profile (id, tenant_id, user_id, first_name, last_name, email, phone, address_line_1, city, state, zip_code, country, user_status, user_role, created_at, updated_at)
VALUES
(1, 'tenant_demo_001', 'user001', 'Alice', 'Johnson', 'alice.johnson@example.com', '555-1001', '123 Main St', 'Springfield', 'IL', '62701', 'USA', 'ACTIVE', 'MEMBER', now(), now()),
(2, 'tenant_demo_001', 'user002', 'Bob', 'Smith', 'bob.smith@example.com', '555-1002', '456 Oak Ave', 'Springfield', 'IL', '62702', 'USA', 'ACTIVE', 'ADMIN', now(), now()),
(3, 'tenant_demo_001', 'user003', 'Carol', 'Williams', 'carol.williams@example.com', '555-1003', '789 Pine Rd', 'Springfield', 'IL', '62703', 'USA', 'INACTIVE', 'VOLUNTEER', now(), now()),
(4, 'tenant_demo_001', 'user004', 'David', 'Brown', 'david.brown@example.com', '555-1004', '321 Maple St', 'Springfield', 'IL', '62704', 'USA', 'PENDING_APPROVAL', 'ORGANIZER', now(), now()),
(5, 'tenant_demo_001', 'user005', 'Eve', 'Davis', 'eve.davis@example.com', '555-1005', '654 Cedar Ave', 'Springfield', 'IL', '62705', 'USA', 'SUSPENDED', 'SUPER_ADMIN', now(), now()),
(6, 'tenant_demo_001', 'user006', 'Frank', 'Miller', 'frank.miller@example.com', '555-1006', '987 Birch Blvd', 'Springfield', 'IL', '62706', 'USA', 'BANNED', 'MEMBER', now(), now());

-- 3. event_details (parent for event_attendee, event_guest_pricing, event_media, etc.)
INSERT INTO public.event_details (
  id, tenant_id, title, caption, description, start_date, end_date, start_time, end_time, location, capacity, admission_type, is_active, max_guests_per_attendee, allow_guests, require_guest_approval, enable_guest_pricing, registration_deadline, cancellation_deadline, created_by_id, event_type_id, created_at, updated_at
) VALUES
(1, 'tenant_demo_001', 'Spring Gala', 'Annual Spring Gala', 'A celebration of spring with music and food.', '2025-08-10', '2025-08-10', '18:00', '23:00', 'Grand Hall', 200, 'TICKETED', true, 2, true, false, true, '2025-08-05 23:59', '2025-08-05 23:59', 1, 1, now(), now()),
(2, 'tenant_demo_001', 'Tech Conference', '2025 Tech Innovations', 'A conference on the latest in technology.', '2025-08-16', '2025-08-16', '09:00', '17:00', 'Convention Center', 500, 'TICKETED', true, 1, true, true, false, '2025-08-12 23:59', '2025-08-12 23:59', 2, 2, now(), now()),
(3, 'tenant_demo_001', 'Charity Run', '5K Charity Run', 'A 5K run to raise funds for charity.', '2025-09-01', '2025-09-01', '07:00', '12:00', 'City Park', 300, 'DONATION_BASED', true, 0, false, false, false, '2025-08-28 23:59', '2025-08-28 23:59', 3, 3, now(), now()),
(4, 'tenant_demo_001', 'Family Picnic', 'Community Family Picnic', 'A fun picnic for families in the community.', '2025-09-10', '2025-09-10', '11:00', '16:00', 'Lakeside Park', 150, 'FREE', true, 4, true, false, false, '2025-09-05 23:59', '2025-09-05 23:59', 4, 4, now(), now()),
(5, 'tenant_demo_001', 'VIP Dinner', 'Exclusive VIP Dinner', 'A dinner event for VIP guests.', '2025-09-15', '2025-09-15', '19:00', '22:00', 'Skyline Restaurant', 50, 'INVITATION_ONLY', true, 0, false, true, false, '2025-09-12 23:59', '2025-09-12 23:59', 5, 5, now(), now()),
(6, 'tenant_demo_001', 'Summer Fest', 'Summer Festival', 'A festival with games, food, and music.', '2025-09-20', '2025-09-20', '10:00', '20:00', 'Downtown Plaza', 400, 'TICKETED', true, 3, true, true, true, '2025-09-12 23:59', '2025-09-12 23:59', 6, 6, now(), now());

-- 4. event_guest_pricing (child of event_details)
INSERT INTO public.event_guest_pricing (id, tenant_id, event_id, age_group, price, is_active, valid_from, valid_to, description, max_guests, pricing_tier, early_bird_price, early_bird_deadline, group_discount_threshold, group_discount_percentage, created_at, updated_at)
VALUES
(1, 'tenant_demo_001', 1, 'ADULT', 50.00, true, '2025-03-01', '2025-04-10', 'Adult pricing for Spring Gala', 2, 'Standard', 40.00, '2025-03-15 23:59', 5, 10.00, now(), now()),
(2, 'tenant_demo_001', 1, 'CHILD', 25.00, true, '2025-03-01', '2025-04-10', 'Child pricing for Spring Gala', 2, 'Standard', 20.00, '2025-03-15 23:59', 5, 10.00, now(), now()),
(3, 'tenant_demo_001', 2, 'ADULT', 100.00, true, '2025-04-01', '2025-05-15', 'Adult pricing for Tech Conference', 1, 'Premium', 80.00, '2025-04-20 23:59', 3, 15.00, now(), now()),
(4, 'tenant_demo_001', 2, 'TEEN', 60.00, true, '2025-04-01', '2025-05-15', 'Teen pricing for Tech Conference', 1, 'Premium', 50.00, '2025-04-20 23:59', 3, 15.00, now(), now()),
(5, 'tenant_demo_001', 3, 'ADULT', 0.00, true, '2025-05-01', '2025-06-01', 'Free for Charity Run', NULL, 'Free', NULL, NULL, NULL, NULL, now(), now()),
(6, 'tenant_demo_001', 4, 'ADULT', 10.00, true, '2025-07-01', '2025-07-20', 'Adult pricing for Family Picnic', 4, 'Standard', 8.00, '2025-07-10 23:59', 2, 5.00, now(), now());

-- 5. event_admin (child of user_profile)
INSERT INTO public.event_admin (id, tenant_id, role, permissions, is_active, created_at, updated_at, user_id, created_by_id)
VALUES
(1, 'tenant_demo_001', 'ADMIN', ARRAY['CREATE_EVENT','EDIT_EVENT'], true, now(), now(), 2, 1),
(2, 'tenant_demo_001', 'SUPER_ADMIN', ARRAY['ALL'], true, now(), now(), 5, 2),
(3, 'tenant_demo_001', 'ORGANIZER', ARRAY['MANAGE_ATTENDEES'], true, now(), now(), 4, 2),
(4, 'tenant_demo_001', 'VOLUNTEER', ARRAY['ASSIST'], true, now(), now(), 3, 1),
(5, 'tenant_demo_001', 'MEMBER', ARRAY['VIEW'], true, now(), now(), 1, 2),
(6, 'tenant_demo_001', 'ADMIN', ARRAY['CREATE_EVENT','EDIT_EVENT'], false, now(), now(), 6, 1);

-- 6. event_admin_audit_log (child of event_admin)
INSERT INTO public.event_admin_audit_log (id, tenant_id, action, table_name, record_id, changes, old_values, new_values, ip_address, user_agent, session_id, created_at, admin_id)
VALUES
(1, 'tenant_demo_001', 'UPDATE', 'event_details', '1', '{"field":"title"}', '{"title":"Old"}', '{"title":"New"}', '192.168.1.1', 'Mozilla/5.0', 'sess1', now(), 1),
(2, 'tenant_demo_001', 'INSERT', 'event_details', '2', '{"field":"caption"}', NULL, '{"caption":"Added"}', '192.168.1.2', 'Mozilla/5.0', 'sess2', now(), 2),
(3, 'tenant_demo_001', 'DELETE', 'event_details', '3', NULL, '{"id":3}', NULL, '192.168.1.3', 'Mozilla/5.0', 'sess3', now(), 3),
(4, 'tenant_demo_001', 'UPDATE', 'event_admin', '4', '{"field":"role"}', '{"role":"MEMBER"}', '{"role":"ADMIN"}', '192.168.1.4', 'Mozilla/5.0', 'sess4', now(), 4),
(5, 'tenant_demo_001', 'INSERT', 'event_admin', '5', '{"field":"permissions"}', NULL, '{"permissions":["ALL"]}', '192.168.1.5', 'Mozilla/5.0', 'sess5', now(), 5),
(6, 'tenant_demo_001', 'DELETE', 'event_admin', '6', NULL, '{"id":6}', NULL, '192.168.1.6', 'Mozilla/5.0', 'sess6', now(), 6);

-- 7. event_attendee (child of event_details, user_profile)
INSERT INTO public.event_attendee (id, tenant_id, event_id, attendee_id, registration_status, registration_date, attendee_type, check_in_status, created_at, updated_at, first_name, last_name, email, phone, is_member)
VALUES
(1, 'tenant_demo_001', 1, 1, 'CONFIRMED', now(), 'MEMBER', 'CHECKED_IN', now(), now(), 'Alice', 'Johnson', 'alice.johnson@example.com', '555-1001', true),
(2, 'tenant_demo_001', 1, 2, 'CONFIRMED', now(), 'ADMIN', 'NOT_CHECKED_IN', now(), now(), 'Bob', 'Smith', 'bob.smith@example.com', '555-1002', true),
(3, 'tenant_demo_001', 2, 3, 'PENDING', now(), 'VOLUNTEER', 'NOT_CHECKED_IN', now(), now(), 'Carol', 'Williams', 'carol.williams@example.com', '555-1003', false),
(4, 'tenant_demo_001', 3, 4, 'WAITLISTED', now(), 'ORGANIZER', 'NOT_CHECKED_IN', now(), now(), 'David', 'Brown', 'david.brown@example.com', '555-1004', true),
(5, 'tenant_demo_001', 4, 5, 'CANCELLED', now(), 'SUPER_ADMIN', 'NO_SHOW', now(), now(), 'Eve', 'Davis', 'eve.davis@example.com', '555-1005', false),
(6, 'tenant_demo_001', 5, 6, 'CONFIRMED', now(), 'MEMBER', 'CHECKED_IN', now(), now(), 'Frank', 'Miller', 'frank.miller@example.com', '555-1006', true);


-- 8. event_attendee_guest (child of event_attendee)
INSERT INTO public.event_attendee_guest (id, tenant_id, primary_attendee_id, age_group, relationship, registration_status, check_in_status, created_at, updated_at, first_name, last_name, email, phone)
VALUES
(1, 'tenant_demo_001', 1,  'CHILD', 'CHILD', 'CONFIRMED', 'CHECKED_IN', now(), now(), 'Sally', 'Guest', 'sally.guest@example.com', '555-2001'),
(2, 'tenant_demo_001', 2,  'ADULT', 'SPOUSE', 'CONFIRMED', 'NOT_CHECKED_IN', now(), now(), 'Tom', 'Guest', 'tom.guest@example.com', '555-2002'),
(3, 'tenant_demo_001', 3,  'TEEN', 'FRIEND', 'PENDING', 'NOT_CHECKED_IN', now(), now(), 'Jerry', 'Guest', 'jerry.guest@example.com', '555-2003'),
(4, 'tenant_demo_001', 4,  'INFANT', 'CHILD', 'WAITLISTED', 'NOT_CHECKED_IN', now(), now(), 'Linda', 'Guest', 'linda.guest@example.com', '555-2004'),
(5, 'tenant_demo_001', 5,  'ADULT', 'COLLEAGUE', 'CANCELLED', 'NO_SHOW', now(), now(), 'Sam', 'Guest', 'sam.guest@example.com', '555-2005'),
(6, 'tenant_demo_001', 6,  'CHILD', 'RELATIVE', 'CONFIRMED', 'CHECKED_IN', now(), now(), 'Nina', 'Guest', 'nina.guest@example.com', '555-2006');


-- 9. event_calendar_entry (child of event_details)
INSERT INTO public.event_calendar_entry (id, tenant_id, calendar_provider, external_event_id, calendar_link, sync_status, last_sync_at, sync_error_message, created_at, updated_at, event_id, created_by_id)
VALUES
(1, 'tenant_demo_001', 'Google', 'gcal_1', 'https://calendar.google.com/event1', 'PENDING', now(), NULL, now(), now(), 1, 1),
(2, 'tenant_demo_001', 'Outlook', 'outlook_2', 'https://outlook.com/event2', 'COMPLETED', now(), NULL, now(), now(), 2, 2),
(3, 'tenant_demo_001', 'Apple', 'apple_3', 'https://apple.com/event3', 'FAILED', now(), 'Error syncing', now(), now(), 3, 3),
(4, 'tenant_demo_001', 'Google', 'gcal_4', 'https://calendar.google.com/event4', 'PENDING', now(), NULL, now(), now(), 4, 4),
(5, 'tenant_demo_001', 'Outlook', 'outlook_5', 'https://outlook.com/event5', 'COMPLETED', now(), NULL, now(), now(), 5, 5),
(6, 'tenant_demo_001', 'Apple', 'apple_6', 'https://apple.com/event6', 'FAILED', now(), 'Error syncing', now(), now(), 6, 6);

-- 10. event_discount_code (link table)
INSERT INTO public.event_discount_code (event_id, discount_code_id)
VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6);

-- 11. event_live_update (child of event_details)
INSERT INTO public.event_live_update (id, event_id, update_type, content_text, content_image_url, content_video_url, content_link_url, metadata, display_order, is_default, created_at, updated_at)
VALUES
(1, 1, 'INFO', 'Welcome to Spring Gala!', NULL, NULL, NULL, NULL, 1, true, now(), now()),
(2, 2, 'ALERT', 'Tech Conference Keynote at 10am', NULL, NULL, NULL, NULL, 2, false, now(), now()),
(3, 3, 'INFO', 'Charity Run starts at 7am', NULL, NULL, NULL, NULL, 3, false, now(), now()),
(4, 4, 'INFO', 'Family Picnic games at noon', NULL, NULL, NULL, NULL, 4, false, now(), now()),
(5, 5, 'ALERT', 'VIP Dinner seating at 7pm', NULL, NULL, NULL, NULL, 5, false, now(), now()),
(6, 6, 'INFO', 'Summer Fest parade at 5pm', NULL, NULL, NULL, NULL, 6, false, now(), now());

-- 12. event_live_update_attachment (child of event_live_update)
INSERT INTO public.event_live_update_attachment (id, live_update_id, attachment_type, attachment_url, display_order, metadata, created_at, updated_at)
VALUES
(1, 1, 'IMAGE', 'https://example.com/image1.jpg', 1, NULL, now(), now()),
(2, 2, 'VIDEO', 'https://example.com/video2.mp4', 2, NULL, now(), now()),
(3, 3, 'IMAGE', 'https://example.com/image3.jpg', 3, NULL, now(), now()),
(4, 4, 'IMAGE', 'https://example.com/image4.jpg', 4, NULL, now(), now()),
(5, 5, 'VIDEO', 'https://example.com/video5.mp4', 5, NULL, now(), now()),
(6, 6, 'IMAGE', 'https://example.com/image6.jpg', 6, NULL, now(), now());

-- 13. event_media (child of event_details)
INSERT INTO public.event_media (
  tenant_id, title, description, event_media_type, storage_type, file_url, file_data, file_data_content_type, content_type, file_size, is_public, event_flyer, is_event_management_official_document, pre_signed_url, pre_signed_url_expires_at, alt_text, display_order, download_count, is_featured, is_hero_image, is_active_hero_image, created_at, updated_at, event_id, uploaded_by_id
) VALUES
('tenant_demo_001','Spring Gala Flyer','This is a high-resolution flyer for the Spring Gala event, featuring the event schedule, sponsors, and venue map. Please use this for all promotional materials.','IMAGE','LOCAL','https://example.com/flyer1.jpg',NULL,'image/jpeg',NULL,1024,TRUE,TRUE,FALSE,NULL,NULL,'Spring Gala official flyer',0,0,FALSE,FALSE,FALSE,now(),now(),1,1),
('tenant_demo_001','Tech Conference Brochure','Comprehensive brochure for the Tech Conference, including speaker bios, session details, and exhibitor information. Designed for both print and digital distribution.','PDF','S3','https://example.com/brochure2.pdf',NULL,'application/pdf',NULL,2048,TRUE,FALSE,TRUE,NULL,NULL,'Tech Conference 2025 Brochure',1,0,FALSE,FALSE,FALSE,now(),now(),2,2),
('tenant_demo_001','Charity Run Poster','Official poster for the Charity Run event. Includes route map, safety instructions, and sponsor logos. Suitable for display at partner locations.','IMAGE','LOCAL','https://example.com/poster3.jpg',NULL,'image/jpeg',NULL,512,TRUE,FALSE,FALSE,NULL,NULL,'Charity Run 2025 Poster',2,0,FALSE,FALSE,FALSE,now(),now(),3,3),
('tenant_demo_001','Family Picnic Map','Detailed map for the Family Picnic, showing picnic areas, restrooms, parking, and activity zones. Provided as a downloadable image for attendees.','IMAGE','S3','https://example.com/map4.jpg',NULL,'image/jpeg',NULL,256,TRUE,FALSE,FALSE,NULL,NULL,'Family Picnic Map',3,0,FALSE,FALSE,FALSE,now(),now(),4,4),
('tenant_demo_001','VIP Dinner Menu','Menu for the VIP Dinner event, listing all courses, wine pairings, and chef notes. Designed for table display and guest reference.','PDF','LOCAL','https://example.com/menu5.pdf',NULL,'application/pdf',NULL,128,TRUE,FALSE,TRUE,NULL,NULL,'VIP Dinner Menu',4,0,FALSE,FALSE,FALSE,now(),now(),5,5),
('tenant_demo_001','Summer Fest Banner','Large digital banner for Summer Fest, used for online promotion and event entrance. Features event branding and key highlights.','IMAGE','S3','https://example.com/banner6.jpg',NULL,'image/jpeg',NULL,2048,TRUE,TRUE,FALSE,NULL,NULL,'Summer Fest Banner',5,0,FALSE,FALSE,FALSE,now(),now(),6,6);

-- 14. event_organizer (child of event_details, user_profile)
INSERT INTO public.event_organizer (id, tenant_id, title, designation, contact_email, contact_phone, is_primary, display_order, bio, profile_image_url, created_at, updated_at, event_id, organizer_id)
VALUES
(1, 'tenant_demo_001', 'Lead Organizer', 'Manager', 'lead1@example.com', '555-3001', true, 1, 'Lead for Spring Gala', 'https://example.com/lead1.jpg', now(), now(), 1, 1),
(2, 'tenant_demo_001', 'Co-Organizer', 'Assistant', 'co2@example.com', '555-3002', false, 2, 'Co-lead for Tech Conference', 'https://example.com/co2.jpg', now(), now(), 2, 2),
(3, 'tenant_demo_001', 'Volunteer Lead', 'Volunteer', 'vol3@example.com', '555-3003', false, 3, 'Volunteer for Charity Run', 'https://example.com/vol3.jpg', now(), now(), 3, 3),
(4, 'tenant_demo_001', 'Family Host', 'Host', 'host4@example.com', '555-3004', true, 4, 'Host for Family Picnic', 'https://example.com/host4.jpg', now(), now(), 4, 4),
(5, 'tenant_demo_001', 'VIP Host', 'Manager', 'vip5@example.com', '555-3005', true, 5, 'Host for VIP Dinner', 'https://example.com/vip5.jpg', now(), now(), 5, 5),
(6, 'tenant_demo_001', 'Summer Fest Lead', 'Manager', 'summer6@example.com', '555-3006', true, 6, 'Lead for Summer Fest', 'https://example.com/summer6.jpg', now(), now(), 6, 6);

-- 15. event_poll (child of event_details)
INSERT INTO public.event_poll (id, tenant_id, title, description, is_active, is_anonymous, allow_multiple_choices, start_date, end_date, max_responses_per_user, results_visible_to, created_at, updated_at, event_id, created_by_id)
VALUES
(1, 'tenant_demo_001', 'Spring Gala Feedback', 'Feedback poll for Spring Gala', true, false, false, now(), now() + interval '1 day', 1, 'ALL', now(), now(), 1, 1),
(2, 'tenant_demo_001', 'Tech Conference Topics', 'Vote for topics', true, false, true, now(), now() + interval '2 days', 2, 'ALL', now(), now(), 2, 2),
(3, 'tenant_demo_001', 'Charity Run Survey', 'Survey for runners', true, true, false, now(), now() + interval '1 day', 1, 'ALL', now(), now(), 3, 3),
(4, 'tenant_demo_001', 'Family Picnic Games', 'Vote for games', true, false, true, now(), now() + interval '1 day', 3, 'ALL', now(), now(), 4, 4),
(5, 'tenant_demo_001', 'VIP Dinner Menu', 'Choose menu items', true, false, false, now(), now() + interval '1 day', 1, 'ALL', now(), now(), 5, 5),
(6, 'tenant_demo_001', 'Summer Fest Events', 'Vote for events', true, false, true, now(), now() + interval '1 day', 2, 'ALL', now(), now(), 6, 6);

-- 16. event_poll_option (child of event_poll)
INSERT INTO public.event_poll_option (id, tenant_id, option_text, display_order, is_active, created_at, updated_at, poll_id)
VALUES
(1, 'tenant_demo_001', 'Excellent', 1, true, now(), now(), 1),
(2, 'tenant_demo_001', 'Good', 2, true, now(), now(), 1),
(3, 'tenant_demo_001', 'Average', 3, true, now(), now(), 1),
(4, 'tenant_demo_001', 'Topic A', 1, true, now(), now(), 2),
(5, 'tenant_demo_001', 'Topic B', 2, true, now(), now(), 2),
(6, 'tenant_demo_001', 'Fun', 1, true, now(), now(), 4);

-- 17. event_poll_response (child of event_poll_option, event_poll, user_profile)
INSERT INTO public.event_poll_response (id, tenant_id, comment, response_value, is_anonymous, created_at, updated_at, poll_id, poll_option_id, user_id)
VALUES
(1, 'tenant_demo_001', 'Great event!', 'Excellent', false, now(), now(), 1, 1, 1),
(2, 'tenant_demo_001', 'Loved it', 'Good', false, now(), now(), 1, 2, 2),
(3, 'tenant_demo_001', 'Could be better', 'Average', true, now(), now(), 1, 3, 3),
(4, 'tenant_demo_001', 'Vote for Topic A', NULL, false, now(), now(), 2, 4, 4),
(5, 'tenant_demo_001', 'Vote for Topic B', NULL, false, now(), now(), 2, 5, 5),
(6, 'tenant_demo_001', 'Fun games', 'Fun', false, now(), now(), 4, 6, 6);

-- 18. event_score_card (child of event_details)
INSERT INTO public.event_score_card (id, event_id, team_a_name, team_b_name, team_a_score, team_b_score, remarks, created_at, updated_at)
VALUES
(1, 1, 'Team Red', 'Team Blue', 10, 8, 'Close match', now(), now()),
(2, 2, 'Team Alpha', 'Team Beta', 15, 12, 'Exciting', now(), now()),
(3, 3, 'Team One', 'Team Two', 7, 9, 'Well played', now(), now()),
(4, 4, 'Team A', 'Team B', 5, 5, 'Draw', now(), now()),
(5, 5, 'Team X', 'Team Y', 20, 18, 'High scoring', now(), now()),
(6, 6, 'Team Sun', 'Team Moon', 13, 14, 'Nail-biter', now(), now());

-- 19. event_score_card_detail (child of event_score_card)
INSERT INTO public.event_score_card_detail (id, score_card_id, team_name, player_name, points, remarks, created_at, updated_at)
VALUES
(1, 1, 'Team Red', 'Alice', 5, 'Great play', now(), now()),
(2, 1, 'Team Blue', 'Bob', 4, 'Strong defense', now(), now()),
(3, 2, 'Team Alpha', 'Carol', 8, 'Top scorer', now(), now()),
(4, 2, 'Team Beta', 'David', 7, 'Good effort', now(), now()),
(5, 3, 'Team One', 'Eve', 3, 'Quick start', now(), now()),
(6, 3, 'Team Two', 'Frank', 6, 'Solid finish', now(), now());

-- 20. event_ticket_type (child of event_details)
INSERT INTO public.event_ticket_type (id, tenant_id, event_id, code, name, description, price, available_quantity, sold_quantity, is_active, created_at, updated_at)
VALUES
(1, 'tenant_demo_001', 1, 'STD', 'Standard', 'Standard ticket for Spring Gala', 50.00, 100, 10, true, now(), now()),
(2, 'tenant_demo_001', 2, 'VIP', 'VIP', 'VIP ticket for Tech Conference', 200.00, 50, 5, true, now(), now()),
(3, 'tenant_demo_001', 3, 'RUN', 'Runner', 'Runner ticket for Charity Run', 0.00, 300, 100, true, now(), now()),
(4, 'tenant_demo_001', 4, 'FAM', 'Family', 'Family ticket for Picnic', 20.00, 30, 10, true, now(), now()),
(5, 'tenant_demo_001', 5, 'DIN', 'Dinner', 'Dinner ticket for VIP Dinner', 100.00, 20, 8, true, now(), now()),
(6, 'tenant_demo_001', 6, 'FEST', 'Festival', 'Festival ticket for Summer Fest', 30.00, 200, 50, true, now(), now());

-- 21. event_ticket_transaction (child of event_ticket_type, discount_code, event_details)
INSERT INTO public.event_ticket_transaction (id, tenant_id, transaction_reference, email, first_name, last_name, phone, quantity, price_per_unit, total_amount, tax_amount, fee_amount, discount_code_id, discount_amount, final_amount, status, payment_method, payment_reference, purchase_date, confirmation_sent_at, refund_amount, refund_date, refund_reason, created_at, updated_at, event_id, ticket_type_id)
VALUES
(1, 'tenant_demo_001', 'TXN001', 'alice.johnson@example.com', 'Alice', 'Johnson', '555-1001', 2, 50.00, 100.00, 5.00, 2.00, 1, 10.00, 87.00, 'COMPLETED', 'CARD', 'REF001', now(), now(), 0, NULL, NULL, now(), now(), 1, 1),
(2, 'tenant_demo_001', 'TXN002', 'bob.smith@example.com', 'Bob', 'Smith', '555-1002', 1, 200.00, 200.00, 10.00, 5.00, 2, 20.00, 185.00, 'COMPLETED', 'CARD', 'REF002', now(), now(), 0, NULL, NULL, now(), now(), 2, 2),
(3, 'tenant_demo_001', 'TXN003', 'carol.williams@example.com', 'Carol', 'Williams', '555-1003', 3, 0.00, 0.00, 0.00, 0.00, 3, 0.00, 0.00, 'COMPLETED', 'CASH', 'REF003', now(), now(), 0, NULL, NULL, now(), now(), 3, 3),
(4, 'tenant_demo_001', 'TXN004', 'david.brown@example.com', 'David', 'Brown', '555-1004', 4, 20.00, 80.00, 4.00, 1.00, 4, 5.00, 70.00, 'COMPLETED', 'CARD', 'REF004', now(), now(), 0, NULL, NULL, now(), now(), 4, 4),
(5, 'tenant_demo_001', 'TXN005', 'eve.davis@example.com', 'Eve', 'Davis', '555-1005', 1, 100.00, 100.00, 5.00, 2.00, 5, 10.00, 87.00, 'COMPLETED', 'CARD', 'REF005', now(), now(), 0, NULL, NULL, now(), now(), 5, 5),
(6, 'tenant_demo_001', 'TXN006', 'frank.miller@example.com', 'Frank', 'Miller', '555-1006', 2, 30.00, 60.00, 3.00, 1.00, 6, 2.00, 54.00, 'COMPLETED', 'CARD', 'REF006', now(), now(), 0, NULL, NULL, now(), now(), 6, 6);

-- 23. qr_code_usage (standalone)
INSERT INTO public.qr_code_usage (id, tenant_id, attendee_id, qr_code_data, created_at)
VALUES
(1, 'tenant_demo_001', 1, 'QR1', now()),
(2, 'tenant_demo_001', 2, 'QR2', now()),
(3, 'tenant_demo_001', 3, 'QR3', now()),
(4, 'tenant_demo_001', 4, 'QR4', now()),
(5, 'tenant_demo_001', 5, 'QR5', now()),
(6, 'tenant_demo_001', 6, 'QR6', now());

-- 24. rel_event_details__discount_codes (link table)
INSERT INTO public.rel_event_details__discount_codes (event_details_id, discount_codes_id)
VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6);

-- 25. tenant_organization (standalone)
INSERT INTO public.tenant_organization (id, tenant_id, organization_name, contact_email, is_active, created_at, updated_at)
VALUES
(1, 'tenant_demo_001', 'Malayalees US', 'contact1@example.com', true, now(), now()),
(2, 'tenant_demo_002', 'Techies US', 'contact2@example.com', true, now(), now()),
(3, 'tenant_demo_003', 'Charity Org', 'contact3@example.com', true, now(), now()),
(4, 'tenant_demo_004', 'Family Org', 'contact4@example.com', true, now(), now()),
(5, 'tenant_demo_005', 'VIP Org', 'contact5@example.com', true, now(), now()),
(6, 'tenant_demo_006', 'Summer Org', 'contact6@example.com', true, now(), now());

-- 26. tenant_settings (standalone)
INSERT INTO public.tenant_settings (id, tenant_id, allow_user_registration, require_admin_approval, enable_whatsapp_integration, enable_email_marketing, enable_guest_registration, max_guests_per_attendee, default_event_capacity, created_at, updated_at)
VALUES
(1, 'tenant_demo_001', true, false, false, false, true, 5, 100, now(), now()),
(2, 'tenant_demo_002', true, true, true, false, true, 10, 200, now(), now()),
(3, 'tenant_demo_003', false, false, false, true, false, 3, 50, now(), now()),
(4, 'tenant_demo_004', true, false, true, true, true, 8, 150, now(), now()),
(5, 'tenant_demo_005', true, true, false, true, false, 2, 75, now(), now()),
(6, 'tenant_demo_006', false, true, true, false, true, 6, 120, now(), now());

-- 27. user_payment_transaction (child of user_profile)
INSERT INTO public.user_payment_transaction (
  id, tenant_id, transaction_type, amount, currency, status, payment_method, event_id, ticket_transaction_id, created_at, updated_at
) VALUES
(1, 'tenant_demo_001', 'TICKET_SALE', 100.00, 'USD', 'COMPLETED', 'CARD', 1, 1, now(), now()),
(2, 'tenant_demo_001', 'SUBSCRIPTION', 200.00, 'USD', 'COMPLETED', 'CARD', 2, NULL, now(), now()),
(3, 'tenant_demo_001', 'COMMISSION', 50.00, 'USD', 'PENDING', 'CASH', 3, 2, now(), now()),
(4, 'tenant_demo_001', 'REFUND', 75.00, 'USD', 'FAILED', 'CARD', 4, 3, now(), now()),
(5, 'tenant_demo_001', 'TICKET_SALE', 120.00, 'USD', 'COMPLETED', 'CARD', 5, 4, now(), now()),
(6, 'tenant_demo_001', 'SUBSCRIPTION', 60.00, 'USD', 'REFUNDED', 'CASH', 6, NULL, now(), now());

-- 28. user_subscription (child of user_profile)
INSERT INTO public.user_subscription (id, tenant_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_current_period_end, status, trial_ends_at, cancel_at_period_end, user_profile_id, created_at, updated_at)
VALUES
(1, 'tenant_demo_001', 'cus_001', 'sub_001', 'price_001', now() + interval '30 days', 'ACTIVE', now() + interval '7 days', false, 1, now(), now()),
(2, 'tenant_demo_001', 'cus_002', 'sub_002', 'price_002', now() + interval '30 days', 'TRIAL', now() + interval '14 days', false, 2, now(), now()),
(3, 'tenant_demo_001', 'cus_003', 'sub_003', 'price_003', now() + interval '30 days', 'CANCELLED', now() + interval '7 days', true, 3, now(), now()),
(4, 'tenant_demo_001', 'cus_004', 'sub_004', 'price_004', now() + interval '30 days', 'EXPIRED', now() + interval '7 days', false, 4, now(), now()),
(5, 'tenant_demo_001', 'cus_005', 'sub_005', 'price_005', now() + interval '30 days', 'SUSPENDED', now() + interval '7 days', false, 5, now(), now()),
(6, 'tenant_demo_001', 'cus_006', 'sub_006', 'price_006', now() + interval '30 days', 'ACTIVE', now() + interval '7 days', false, 6, now(), now());

-- 29. user_task (child of user_profile, event_details)
INSERT INTO public.user_task (id, tenant_id, title, description, status, priority, due_date, completed, completion_date, estimated_hours, actual_hours, progress_percentage, event_id, assignee_name, assignee_contact_phone, assignee_contact_email, created_at, updated_at, user_id)
VALUES
(1, 'tenant_demo_001', 'Setup Venue', 'Setup the venue for Spring Gala', 'PENDING', 'HIGH', now() + interval '2 days', false, NULL, 5.0, NULL, 0, 1, 'Alice', '555-1001', 'alice.johnson@example.com', now(), now(), 1),
(2, 'tenant_demo_001', 'Arrange Catering', 'Arrange food for Tech Conference', 'PENDING', 'MEDIUM', now() + interval '3 days', false, NULL, 3.0, NULL, 0, 2, 'Bob', '555-1002', 'bob.smith@example.com', now(), now(), 2),
(3, 'tenant_demo_001', 'Distribute Flyers', 'Distribute flyers for Charity Run', 'COMPLETED', 'LOW', now() - interval '1 day', true, now(), 2.0, 2.0, 100, 3, 'Carol', '555-1003', 'carol.williams@example.com', now(), now(), 3),
(4, 'tenant_demo_001', 'Book Park', 'Book park for Family Picnic', 'PENDING', 'HIGH', now() + interval '5 days', false, NULL, 1.0, NULL, 0, 4, 'David', '555-1004', 'david.brown@example.com', now(), now(), 4),
(5, 'tenant_demo_001', 'Send Invites', 'Send invitations for VIP Dinner', 'PENDING', 'MEDIUM', now() + interval '1 day', false, NULL, 1.5, NULL, 0, 5, 'Eve', '555-1005', 'eve.davis@example.com', now(), now(), 5),
(6, 'tenant_demo_001', 'Setup Stage', 'Setup stage for Summer Fest', 'PENDING', 'HIGH', now() + interval '4 days', false, NULL, 4.0, NULL, 0, 6, 'Frank', '555-1006', 'frank.miller@example.com', now(), now(), 6);

-- 30. bulk_operation_log (standalone)
INSERT INTO public.bulk_operation_log (id, tenant_id, operation_type, operation_name, performed_by, target_count, success_count, error_count, skipped_count, operation_details, error_details, execution_time_ms, created_at, completed_at)
VALUES
(1, 'tenant_demo_001', 'IMPORT', 'Import Users', 1, 100, 98, 1, 1, 'Imported users', NULL, 5000, now(), now()),
(2, 'tenant_demo_001', 'EXPORT', 'Export Events', 2, 50, 50, 0, 0, 'Exported events', NULL, 2000, now(), now()),
(3, 'tenant_demo_001', 'SYNC', 'Sync Calendar', 3, 20, 19, 1, 0, 'Synced calendar', '1 error', 1000, now(), now()),
(4, 'tenant_demo_001', 'DELETE', 'Delete Old Data', 4, 10, 10, 0, 0, 'Deleted old data', NULL, 500, now(), now()),
(5, 'tenant_demo_001', 'UPDATE', 'Update Settings', 5, 5, 5, 0, 0, 'Updated settings', NULL, 100, now(), now()),
(6, 'tenant_demo_001', 'IMPORT', 'Import Events', 6, 60, 59, 1, 0, 'Imported events', '1 error', 3000, now(), now());

-- 31. databasechangelog (standalone)
INSERT INTO public.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, md5sum, description, comments, tag, liquibase, contexts, labels, deployment_id)
VALUES
('1', 'admin', 'changelog1.sql', now(), 1, 'EXECUTED', 'abc123', 'Initial', NULL, NULL, '3.8.0', NULL, NULL, 'dep1'),
('2', 'admin', 'changelog2.sql', now(), 2, 'EXECUTED', 'def456', 'Add tables', NULL, NULL, '3.8.0', NULL, NULL, 'dep1'),
('3', 'admin', 'changelog3.sql', now(), 3, 'EXECUTED', 'ghi789', 'Add data', NULL, NULL, '3.8.0', NULL, NULL, 'dep1'),
('4', 'admin', 'changelog4.sql', now(), 4, 'EXECUTED', 'jkl012', 'Update schema', NULL, NULL, '3.8.0', NULL, NULL, 'dep1'),
('5', 'admin', 'changelog5.sql', now(), 5, 'EXECUTED', 'mno345', 'Patch', NULL, NULL, '3.8.0', NULL, NULL, 'dep1'),
('6', 'admin', 'changelog6.sql', now(), 6, 'EXECUTED', 'pqr678', 'Hotfix', NULL, NULL, '3.8.0', NULL, NULL, 'dep1');

-- 32. databasechangeloglock (standalone)
INSERT INTO public.databasechangeloglock (id, locked, lockgranted, lockedby)
VALUES
(1, false, now(), 'admin1'),
(2, false, now(), 'admin2'),
(3, false, now(), 'admin3'),
(4, false, now(), 'admin4'),
(5, false, now(), 'admin5'),
(6, false, now(), 'admin6');