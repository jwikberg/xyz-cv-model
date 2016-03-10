'use strict';

/**
 * Module dependencies.
 */
var adminModel = require('../model/admin.model');
var skillGroupsModel = require('../model/skillGroups.model');
var responseHandler = require('../utils/response.handler');

module.exports = function(routes) {

    // get skillGroups model
    routes.get('/skillGroups', function(request, response) {
        skillGroupsModel.getSkillGroupsModel(request.headers)
            .then(responseHandler.sendJsonResponse(response))
            .catch(responseHandler.sendErrorResponse(response));
    });

    // get admin model
    routes.get('/', function(request, response) {
        adminModel.getAdminModel(request.headers)
            .then(responseHandler.sendJsonResponse(response))
            .catch(responseHandler.sendErrorResponse(response));
    });

    return routes;
};
