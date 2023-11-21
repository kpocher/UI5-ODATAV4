# UI5-ODATAV4

OData is a standard protocol for creating and consuming data by using simple HTTP and REST APIs for create, read, update, delete (CRUD) operations.

-> Grundstruktur des Projektes von https://sapui5.hana.ondemand.com/#/entity/sap.ui.core.tutorial.odatav4/sample/sap.ui.core.tutorial.odatav4.01/code


# Validation mit ODATA

In der Manifest.json kann der Paramter handelValidation gesetzt werden. Dieser triggert dann automatisch das Anzeigen von Type-Errors im UI5

-> Coding: "handleValidation": true,
-> Durch die Vorgabe in den Metadaten kann der Service direkt den Type prüfen (auch werden ausdrücke wie NULLABLE geprüft)
![alt text](./pics/ODATA_validation.png)