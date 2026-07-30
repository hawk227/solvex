CREATE TABLE `technician_areas` (
	`technician_id` integer NOT NULL,
	`area_id` integer NOT NULL,
	PRIMARY KEY(`technician_id`, `area_id`),
	FOREIGN KEY (`technician_id`) REFERENCES `technicians`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `technician_skills` (
	`technician_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	PRIMARY KEY(`technician_id`, `category_id`),
	FOREIGN KEY (`technician_id`) REFERENCES `technicians`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `technicians` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`base_area` text,
	`photo_key` text,
	`joined_on` text,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `technicians_phone_unique` ON `technicians` (`phone`);--> statement-breakpoint
CREATE INDEX `technicians_active_idx` ON `technicians` (`active`);--> statement-breakpoint
ALTER TABLE `orders` ADD `technician_id` integer REFERENCES technicians(id);