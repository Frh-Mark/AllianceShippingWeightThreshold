/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['./mrk_threshold_helper'], (HELPER) => {

    const saveRecord = (context) => {
        try {
            // check if create event
            if (context.mode == 'create') {
            let isValid = HELPER.HELPERS.checkThreshold(context);
            log.debug('isValid', isValid);
            return isValid;
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