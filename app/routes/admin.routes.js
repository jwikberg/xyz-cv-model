'use strict';

/**
 * Module dependencies.
 */
var adminModel = require('../model/admin.model');
var responseHandler = require('../utils/response.handler');

module.exports = function(routes) {

    // get dashboard model
    routes.get('/', function(request, response) {
        adminModel.getAdminModel(request.headers)
            .then(responseHandler.sendJsonResponse(response))
            .catch(responseHandler.sendErrorResponse(response));
    });

    return routes;
};
