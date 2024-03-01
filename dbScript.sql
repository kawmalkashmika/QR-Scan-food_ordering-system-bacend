CREATE TABLE `h2_pos_harpos_cloud`.`core_mobile_table_reservation` (
  `RESERVATION_ID` BIGINT(10) NOT NULL AUTO_INCREMENT,
  `RESERVED_USER` VARCHAR(15) NOT NULL,
  `RESERVED_TABLE_ID` INT(11) NOT NULL,
  `OTP` VARCHAR(45) NOT NULL,
  `STATUS` INT NOT NULL,
  PRIMARY KEY (`RESERVATION_ID`),
  INDEX `table_reservation_and_table_location_idx` (`RESERVED_TABLE_ID` ASC),
  CONSTRAINT `table_reservation_and_table_location`
    FOREIGN KEY (`RESERVED_TABLE_ID`)
    REFERENCES `h2_pos_harpos_cloud`.`core_pos_location_table` (`ID_LOCATION_TABLE`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);

CREATE TABLE `h2_pos_harpos_cloud`.`core_mobile_user` (
      `USER_ID` BIGINT(10) NOT NULL AUTO_INCREMENT,
      `MOBILE_NUMBER` VARCHAR(15) NOT NULL,
      `OTP` VARCHAR(45) NOT NULL,
      `OTP_STATUS` VARCHAR(15) NULL,
      PRIMARY KEY (`USER_ID`));
