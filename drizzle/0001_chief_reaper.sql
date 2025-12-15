CREATE TABLE `risk_maps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`floor_plan_svg` text NOT NULL,
	`width` int NOT NULL DEFAULT 1000,
	`height` int NOT NULL DEFAULT 800,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `risk_maps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`map_id` int NOT NULL,
	`type` enum('acidental','chemical','ergonomic','physical','biological') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text,
	`x_position` int NOT NULL,
	`y_position` int NOT NULL,
	`radius` int NOT NULL DEFAULT 30,
	`color` varchar(7) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `risks_id` PRIMARY KEY(`id`)
);
