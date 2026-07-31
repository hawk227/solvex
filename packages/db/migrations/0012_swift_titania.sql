ALTER TABLE `categories` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `categories` ADD `deleted_by` text;--> statement-breakpoint
ALTER TABLE `services` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `services` ADD `deleted_by` text;--> statement-breakpoint
ALTER TABLE `admin_user` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `admin_user` ADD `deleted_by` text;--> statement-breakpoint
ALTER TABLE `technicians` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `technicians` ADD `deleted_by` text;