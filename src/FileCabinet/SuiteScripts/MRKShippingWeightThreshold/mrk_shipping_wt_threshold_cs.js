/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['./mrk_threshold_helper'], (HELPER) => {

    const saveRecord = (context) => {
        try {
            if(!!context.currentRecord.isNew) {
                let isValid = HELPER.HELPERS.checkThreshold(context);
                log.debug('isValid', isValid);
                return isValid;
            } else {
                return true;
            }
        } catch (e) {
            log.error('saveRecord Exception', e.message);
            return true;
        }
    }

    return {
        saveRecord: saveRecord
    };

});