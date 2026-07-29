CREATE TABLE `slot_capacity` (
	`date` text NOT NULL,
	`slot_id` integer NOT NULL,
	`capacity` integer NOT NULL,
	PRIMARY KEY(`date`, `slot_id`),
	FOREIGN KEY (`slot_id`) REFERENCES `slot_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `slot_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slot_templates_label_unique` ON `slot_templates` (`label`);