'use strict';

/**
 * Module dependencies.
 */
var skillGroupsModel = require('../model/admin/skillGroups.model');
var responseHandler = require('../utils/response.handler');

module.exports = function(routes) {

    // get skillGroups model
    routes.get('/skillGroups', function(request, response) {
        skillGroupsModel.getSkillGroupsModel(request.headers)
            .then(responseHandler.sendJsonResponse(response))
            .catch(responseHandler.sendErrorResponse(response));
    });

    return routes;
};
