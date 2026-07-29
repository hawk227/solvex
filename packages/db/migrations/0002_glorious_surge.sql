CREATE TABLE `areas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `areas_name_unique` ON `areas` (`name`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`area_id` integer,
	`referral_code` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_referral_code_unique` ON `profiles` (`referral_code`);