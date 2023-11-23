sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator, FilterType, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {

		/**
		 *  Hook for initializing the controller
		 */
		onInit : function () {
			var oMessageManager = sap.ui.getCore().getMessageManager(),
				oMessageModel = oMessageManager.getMessageModel(),
				oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
					new Filter("technical", FilterOperator.EQ, true)),
				oViewModel = new JSONModel({
					busy : false,
					hasUIChanges : false,
					isSplitterOpen: false,
					usernameEmpty : true,
					order : 0
				});
			this.getView().setModel(oViewModel, "appView");
			this.getView().setModel(oMessageModel, "message");

			oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
			this._bTechnicalErrors = false;
		},
        
		onCreate : function () {
            // Create new Entry in Table
			var oList = this.byId("peopleList"),
				oBinding = oList.getBinding("items"),
				oContext = oBinding.create({
					"UserName" : "",
					"FirstName" : "",
					"LastName" : "",
					"Age" : "18"
				});

			this._setUIChanges();
			this.getView().getModel("appView").setProperty("/usernameEmpty", true);
            
            // Set the Cursor
			oList.getItems().some(function (oItem) {
				if (oItem.getBindingContext() === oContext) {
					oItem.focus();
					oItem.setSelected(true);
					return true;
				}
			});
		},
		
		onDelete : function (oEvent) {
			var selectedItem = oEvent.getSource();
		    var oContext,
				oPeopleList = this.byId("peopleList"),
				oSelected = oPeopleList.getSelectedItem(),
		        sUserName;

			// Only when an Entry is selected
			if (oSelected) {
				oContext = oSelected.getBindingContext();
				sUserName = oContext.getProperty("UserName");
				oContext.delete().then(function () {
					MessageToast.show(this._getText("deletionSuccessMessage", sUserName));
				}.bind(this), function (oError) {
                    if (oContext === oPeopleList.getSelectedItem().getBindingContext()) {
                        this._setDetailArea(oContext);
                    }
					this._setUIChanges();
					if (oError.canceled) {
						MessageToast.show(this._getText("deletionRestoredMessage", sUserName));
						return;
					}
					MessageBox.error(oError.message + ": " + sUserName);
				}.bind(this));
                this._setDetailArea();
				this._setUIChanges(true);
			}
		},

		onInputChange : function (oEvt) {
			if (oEvt.getParameter("escPressed")) {
				this._setUIChanges();
			} else {
				this._setUIChanges(true);
				if (oEvt.getSource().getParent().getBindingContext().getProperty("UserName")) {
					this.getView().getModel("appView").setProperty("/usernameEmpty", false);
				}
			}
		},

        onRefresh : function (oEvent) {
			var oBinding = this.byId("peopleList").getBinding("items");
            
            // If the binding has unsaved changes, we display an error message, 
            // otherwise we call refresh() and display a success message
            if (oBinding.hasPendingChanges()) {
                MessageBox.error(this._getText("refreshNotPossibleMessage"));
                return;
            }
            oBinding.refresh();
            MessageToast.show(this._getText("refreshNotPossibleMessage"));
        },
        
		onSave : function () {
			var fnSuccess = function () {
				this._setBusy(false);
				MessageToast.show(this._getText("changesSentMessage"));
				this._setUIChanges(false);
			}.bind(this);

			var fnError = function (oError) {
				this._setBusy(false);
				this._setUIChanges(false);
				MessageBox.error(oError.message);
			}.bind(this);

			this._setBusy(true); // Lock UI until submitBatch is resolved.
			this.getView().getModel().submitBatch("peopleGroup").then(fnSuccess, fnError);
			this._bTechnicalErrors = false; // If there were technical errors, a new save resets them.
		},
        
		onResetChanges : function () {
			this.byId("peopleList").getBinding("items").resetChanges();
			this._bTechnicalErrors = false; 
			this._setUIChanges();
		},

        onSearch : function (oEvent) {
            var sValueSearch = oEvent.getParameter("query");
            var oFilter = new Filter("LastName", FilterOperator.Contains, sValueSearch);

            var oView = this.getView();

			/* var oView = this.getView(),
				sValue = oView.byId("searchField").getValue(),
				oFilter = new Filter("LastName", FilterOperator.Contains, sValue);  */

            oView.byId("peopleList").getBinding("items").filter(oFilter, FilterType.Application);
        },

        onSort : function () {
			var oView = this.getView(),
				aStates = [undefined, "desc", "asc"],
				aStateTextIds = ["sortNone", "sortAscending", "sortDescending"],
				sMessage,
				iOrder = oView.getModel("appView").getProperty("/order");

			iOrder = (iOrder + 1) % aStates.length;
			var sOrder = aStates[iOrder];

			oView.getModel("appView").setProperty("/order", iOrder);

            var itemList = oView.byId("peopleList").getBinding("items");
            itemList.sort(sOrder && new Sorter("LastName", sOrder === "desc"));

			oView.byId("peopleList").getBinding("items").sort(sOrder && new Sorter("LastName", sOrder === "desc"));

			sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]);
			MessageToast.show(sMessage);
        },

        onMessageBindingChange : function (oEvent) {
			var aContexts = oEvent.getSource().getContexts(),
				aMessages,
				bMessageOpen = false;

			if (bMessageOpen || !aContexts.length) {
				return;
			}

			// Extract and remove the technical messages
			aMessages = aContexts.map(function (oContext) {
				return oContext.getObject();
			});
			sap.ui.getCore().getMessageManager().removeMessages(aMessages);

			this._setUIChanges(true);
			this._bTechnicalErrors = true;
			MessageBox.error(aMessages[0].message, {
				id : "serviceErrorMessageBox",
				onClose : function () {
					bMessageOpen = false;
				}
			});

			bMessageOpen = true;
		},
		
		onSelectionChange : function (oEvent) {
			var oBindingContext = oEvent.getParameter("listItem").getBindingContext();
            this._setDetailArea(oBindingContext);
        },

		onSplitterClose : function (oEvent) {
            var oDetailArea  = this.byId("detailArea"),
				oLayout		 = this.byId("defaultLayout"),
				oSearchField = this.byId("searchField"),
			    oPeopleList  = this.byId("peopleList"),
				oSelected    = oPeopleList.getSelectedItem();
			
			var lastSelection = this.oLastSelection;

			var oBindingContext = oSelected.getBindingContext()
			oDetailArea.setVisible(false);
			oLayout.setSize(oBindingContext ? "100%" : "60%");
			oLayout.setResizable(!!oBindingContext);
			oSearchField.setWidth(oBindingContext ? "20%" : "40%");
		
			// Splitter is now openend
			this._setSplitter(false)

			oPeopleList.removeSelections(true); //remove selection

		},

        _getText(sTextId, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
        },

        _setUIChanges : function (bHasUIChanges) {
			if (this._bTechnicalErrors) {
				// If there is currently a technical error, then force 'true'.
				bHasUIChanges = true;
			} else if (bHasUIChanges === undefined) {
				bHasUIChanges = this.getView().getModel().hasPendingChanges();
			}
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/hasUIChanges", bHasUIChanges);
		},

		_setSplitter : function (bIsSplitterOpen) {
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/isSplitterOpen", bIsSplitterOpen);
		},

		_setBusy : function (bIsBusy) {
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/busy", bIsBusy);
		},

		/**
         * Toggles the visibility of the detail area
         *
         * @param {object} [oUserContext] - the current user context
         */
        _setDetailArea : function (oUserContext) {
            var oDetailArea  = this.byId("detailArea"),
                oOldContext,
                oLayout		 = this.byId("defaultLayout"),
                oSearchField = this.byId("searchField");
			
			if (!oDetailArea) {
				return; // do nothing when running within view destruction
			}
	
			oOldContext = oDetailArea.getBindingContext();
			if (oOldContext) {
				oOldContext.setKeepAlive(false);
			}
			if (oUserContext) {
				oUserContext.setKeepAlive(true,
					// hide details if kept entity was refreshed but does not exists any more
					this._setDetailArea.bind(this));
			}
			
			// Splitter is now openend
			this._setSplitter(true)

			oDetailArea.setBindingContext(oUserContext || null);
			// resize view
			oDetailArea.setVisible(!!oUserContext);
			oLayout.setSize(oUserContext ? "60%" : "100%");
			oLayout.setResizable(!!oUserContext);
			oSearchField.setWidth(oUserContext ? "40%" : "20%");
           
        }

	});
});
