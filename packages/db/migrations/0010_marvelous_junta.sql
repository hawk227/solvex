CREATE TABLE `admin_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`subject_id` text,
	`detail` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_subject_idx` ON `admin_audit` (`subject_id`);--> statement-breakpoint
CREATE TABLE `admin_permissions` (
	`admin_user_id` text NOT NULL,
	`module` text NOT NULL,
	`level` text DEFAULT 'none' NOT NULL,
	PRIMARY KEY(`admin_user_id`, `module`),
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `admin_user` ADD `is_owner` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_user` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_user` ADD `must_change_password` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_user` ADD `temp_password_issued_at` integer;--> statement-breakpoint
ALTER TABLE `admin_user` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `admin_user` ADD `last_login_at` integer;