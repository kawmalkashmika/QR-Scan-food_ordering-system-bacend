CREATE TABLE `core_mobile_user` (
  `USER_ID` bigint(10) NOT NULL AUTO_INCREMENT,
  `MOBILE_NUMBER` varchar(15) NOT NULL,
  `OTP` varchar(45) NOT NULL,
  `OTP_STATUS` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`USER_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=latin1

CREATE TABLE `core_mobile_reservation` (
  `RESERVATION_ID` bigint(10) NOT NULL AUTO_INCREMENT,
  `RESERVED_USER_ID` bigint(10) NOT NULL,
  `RESERVED_TABLE_ID` int(11) NOT NULL,
  `RESERVATION_PIN` varchar(45) DEFAULT NULL,
  `IS_ACTIVE` int(11) DEFAULT NULL,
  `PIN_STATUS` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`RESERVATION_ID`),
  KEY `user_and_reservation_idx` (`RESERVED_USER_ID`),
  KEY `table_and_reservation_idx` (`RESERVED_TABLE_ID`),
  CONSTRAINT `table_and_reservation` FOREIGN KEY (`RESERVED_TABLE_ID`) REFERENCES `core_pos_location_table` (`id_location_table`),
  CONSTRAINT `user_and_reservation` FOREIGN KEY (`RESERVED_USER_ID`) REFERENCES `core_mobile_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1

CREATE TABLE `core_mobile_reservation_user` (
  `RESERVATION_USER_ID` bigint(10) NOT NULL AUTO_INCREMENT,
  `RESERVATION_ID` bigint(10) NOT NULL,
  `USER_ID` bigint(10) NOT NULL,
  PRIMARY KEY (`RESERVATION_USER_ID`),
  KEY `user_and_user_reservation_idx` (`USER_ID`),
  KEY `reservation_and_user_reservation_idx` (`RESERVATION_ID`),
  CONSTRAINT `reservation_and_user_reservation` FOREIGN KEY (`RESERVATION_ID`) REFERENCES `core_mobile_reservation` (`reservation_id`),
  CONSTRAINT `user_and_user_reservation` FOREIGN KEY (`USER_ID`) REFERENCES `core_mobile_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1

CREATE TABLE `core_mobile_reservation_order` (
  `RESERVATION_ORDER_ID` bigint(10) NOT NULL AUTO_INCREMENT,
  `RESERVATION_ID` bigint(10) NOT NULL,
  `USER_ID` bigint(10) NOT NULL,
  `ITEM_ID` int(10) NOT NULL,
  `ORDER_STATUS` int(11) DEFAULT '1',
  `QUANTITY` int(11) NOT NULL,
  PRIMARY KEY (`RESERVATION_ORDER_ID`),
  KEY `order_and_user_idx` (`USER_ID`),
  KEY `order_and _reservation_idx` (`RESERVATION_ID`),
  KEY `order_and_item_idx` (`ITEM_ID`),
  CONSTRAINT `order_and _reservation` FOREIGN KEY (`RESERVATION_ID`) REFERENCES `core_mobile_reservation` (`reservation_id`),
  CONSTRAINT `order_and_item` FOREIGN KEY (`ITEM_ID`) REFERENCES `core_inv_item` (`id_item`),
  CONSTRAINT `order_and_user` FOREIGN KEY (`USER_ID`) REFERENCES `core_mobile_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1