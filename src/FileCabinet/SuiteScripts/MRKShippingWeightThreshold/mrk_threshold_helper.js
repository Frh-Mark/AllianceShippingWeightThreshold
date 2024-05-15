/**
 * @NApiVersion 2.1
 */

define(['N/record', 'N/search', 'N/log', 'N/format', 'N/ui/dialog'], (record, search, log, format, dialog) => {

    const CONSTANTS = {
        SUBLIST: {
            ID: 'item',
            FIELD: {
                WEIGHT: 'weightinlb',
                QUANTITY: 'quantity',

            }
        },
        FIELDS: {
            LOC_THRESHOLD_WT: 'custrecord_mrk_threshold_weight',
            LOC_THRESHOLD_WT_DUMP: 'custrecord_mrk_dump_threshold_weight',
            ITEM_WEIGHT: 'custcolcustcol2',
            ON_DEMAND_SHIPDATE: 'custbody_rpod_shipdate',
            LOCATION: 'location',
            DUMP: 'custbody4',
            ORDER_CLASSIFICATION:'custbody_mrk_order_type'
        },
        FLD_VALUES: {
            ORDER_CLASSIFICATION: {
                FOR_DELIVERY: '2'
            }
        },
        MESSAGE: {
            ALERT: {
                TITLE: 'Trucking Capacity Limit exceeds!',
                MESSAGE: 'The total weight for this location on the selected On-Demand Ship Date exceeds the permissible capacity. Please select an alternative On-Demand Ship Date.'
            }
        }
    };

    const HELPERS = {
        checkThreshold: (context) => {
            let doesSOhasValidWt = true;
            try {
                let soWeight = 0;
                let thresholdWeight = 0;
                let totalSoWt = 0;
                let currentRecord = context.currentRecord;
                let shipDate = currentRecord.getValue(CONSTANTS.FIELDS.ON_DEMAND_SHIPDATE);
                let location = currentRecord.getValue(CONSTANTS.FIELDS.LOCATION);
                let isDumpSO = currentRecord.getValue(CONSTANTS.FIELDS.DUMP) || false;
                let orderClassification = currentRecord.getValue(CONSTANTS.FIELDS.ORDER_CLASSIFICATION);
                if (!!shipDate && !!location && !!orderClassification && orderClassification == CONSTANTS.FLD_VALUES.ORDER_CLASSIFICATION.FOR_DELIVERY) {
                    if (!!isDumpSO) {
                        // Get the threshold weight of the location
                        thresholdWeight = HELPERS.getThresholdWeight(location, CONSTANTS.FIELDS.LOC_THRESHOLD_WT_DUMP);
                        totalSoWt = HELPERS.getSOTotalWt(location, shipDate, isDumpSO); // Get Sum of All dump Orders weight
                        CONSTANTS.MESSAGE.ALERT.TITLE = 'Dump Trucking Capacity Limit exceeds!';
                    } else {
                        // Get the threshold weight of the location
                        thresholdWeight = HELPERS.getThresholdWeight(location, CONSTANTS.FIELDS.LOC_THRESHOLD_WT);
                        totalSoWt = HELPERS.getSOTotalWt(location, shipDate, isDumpSO); // Get Sum of All Orders weight

                    }
                    soWeight = HELPERS.getSOWeight(currentRecord);  // Get the total weight of the current sales order
                    let cumulativeWeight = (Number(totalSoWt) + Number(soWeight));
                    log.debug('Values', `ShipDte: ${shipDate}  Location: ${location} ThresholdWt: ${thresholdWeight} SOWeight: ${soWeight} totalSoWt: ${totalSoWt} CumulativeWt: ${cumulativeWeight}`);

                    if (!!thresholdWeight && thresholdWeight > 0 && (cumulativeWeight > thresholdWeight)) {
                        dialog.alert({
                            title: CONSTANTS.MESSAGE.ALERT.TITLE,
                            message: CONSTANTS.MESSAGE.ALERT.MESSAGE
                        });
                        doesSOhasValidWt = false;
                    }
                }
                return doesSOhasValidWt;
            } catch (e) {
                log.error('checkThreshold Exception', e.message + ' ' + e.stack);
                return doesSOhasValidWt;
            }
        },
        getSOWeight: (currentRecord) => {
            try {
                let soWeight = 0;
                let lineCount = currentRecord.getLineCount({
                    sublistId: CONSTANTS.SUBLIST.ID
                });
                for (let i = 0; i < lineCount; i++) {
                    let unitWt = currentRecord.getSublistValue({
                        sublistId: CONSTANTS.SUBLIST.ID,
                        fieldId: CONSTANTS.SUBLIST.FIELD.WEIGHT,
                        line: i
                    });
                    let itemQty = currentRecord.getSublistValue({
                        sublistId: CONSTANTS.SUBLIST.ID,
                        fieldId: CONSTANTS.SUBLIST.FIELD.QUANTITY,
                        line: i
                    });

                    soWeight += (parseFloat(unitWt) * parseFloat(itemQty));
                }
                return soWeight || 0;
            } catch (e) {
                log.error('getSOWeight Exception', e.message + ' ' + e.stack);
            }
        },
        getSOTotalWt: (location, shipDate, dumpDelivery) => {
            try { 
                let totalWeight = 0;
                const formattedShipDate = format.format({
                    value: new Date(shipDate),
                    type: format.Type.DATE
                });
                dumpDelivery = !!dumpDelivery? 'T':'F';
                log.debug('dumpDelivery', dumpDelivery);
                let salesOrderSearch = search.create({
                    type: search.Type.SALES_ORDER,
                    filters:
                        [
                            ["type", "anyof", "SalesOrd"],
                            "AND",
                            ["status", "anyof", "SalesOrd:B"],
                            "AND",
                            ["custbody_mrk_order_type", "anyof", "2"],
                            "AND",
                            ["custbody_rpod_shipdate", "on", formattedShipDate],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["shipping", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["location", "anyof", location], 
                            "AND", 
                            ["custbody4","is", dumpDelivery]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "custcolcustcol2",
                                summary: "SUM"
                            })
                        ]
                });
                var searchResultCount = salesOrderSearch.runPaged().count;
                log.debug("salesOrderSearch result count", searchResultCount);
                salesOrderSearch.run().each(function (result) {
                    totalWeight = result.getValue({ name: CONSTANTS.FIELDS.ITEM_WEIGHT, summary: search.Summary.SUM });
                    return true;
                });
                return totalWeight || 0;
            }
            catch (e) {
                log.error('getSOTotalWt Exception', e.message + ' ' + e.stack);
            }
        },

        getThresholdWeight: (location, fieldId) => {
            try {
                let lookupThresholdFld = search.lookupFields({
                    type: search.Type.LOCATION,
                    id: location,
                    columns: [fieldId]
                });
                let thresholdWeight = lookupThresholdFld[fieldId];
                return thresholdWeight || 0;
            } catch (e) {
                log.error('getThresholdWeight Exception', e.message + ' ' + e.stack);
            }
        }

    };

    return {
        CONSTANTS: CONSTANTS,
        HELPERS: HELPERS
    };
});