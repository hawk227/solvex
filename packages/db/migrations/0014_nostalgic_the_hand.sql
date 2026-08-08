CREATE TABLE `service_costing` (
	`service_id` integer PRIMARY KEY NOT NULL,
	`material` text,
	`tools` text,
	`resource_count` text,
	`resource_cost` integer,
	`service_time_label` text,
	`travel_cost` integer,
	`internal_cost` integer,
	`sop_md` text,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
