CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`admin_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`user_id` text NOT NULL,
	`service_id` integer NOT NULL,
	`combo_key` text DEFAULT '' NOT NULL,
	`base_price` integer NOT NULL,
	`credit_applied` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`scheduled_date` text NOT NULL,
	`slot_id` integer NOT NULL,
	`area_id` integer,
	`name_snapshot` text NOT NULL,
	`phone_snapshot` text NOT NULL,
	`address_snapshot` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`slot_id`) REFERENCES `slot_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_code_unique` ON `orders` (`code`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_slot_date_idx` ON `orders` (`scheduled_date`,`slot_id`);