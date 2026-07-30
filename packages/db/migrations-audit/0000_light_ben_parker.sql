CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`app` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`actor_name` text,
	`actor_email` text,
	`action` text NOT NULL,
	`module` text,
	`target_type` text,
	`target_id` text,
	`target_label` text,
	`outcome` text DEFAULT 'OK' NOT NULL,
	`reason` text,
	`detail` text,
	`ip` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE INDEX `audit_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_log` (`actor_id`,`at`);--> statement-breakpoint
CREATE INDEX `audit_target_idx` ON `audit_log` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_log` (`action`);