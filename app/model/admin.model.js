'use strict';

var userResource = require('../resource/user.resource');
var skillResource = require('../resource/skill.resource');
var skillGroupResource = require('../resource/skillGroup.resource');
var utils = require('../utils/utils');

var Promise = require('bluebird');

function getAdminTemplate() {
    return new Promise(function(resolve) {
        var template = {
            admin: {
                skills: [],
                skillGroups: []
            }
        };
        return resolve(template);
    });
}

exports.getAdminModel = function(headers) {
    return getAdminTemplate()
        .then(loadAdmin(headers));
};

function loadAdmin(headers) {
    return function(model) {
        return userResource.getCurrentUser(headers)
            .then(loadSkills(headers))
            .then(loadSkillGroups(headers))
            .then(utils.setFieldForObject(model, 'admin'));
    };
}

function loadSkills(headers) {
    return function(admin) {
        var skills = skillResource.getAllSkills(headers);
        return Promise.all([skills])
            .then(function() {
                return skills;
            })
            .then(utils.sortListByProperty('name'))
            .then(utils.setFieldForObject(admin, 'skills'));
    };
}

function loadSkillGroups(headers) {
    return function(admin) {
        var skillGroups = skillGroupResource.getAllSkillGroups(headers);
        return Promise.all([skillGroups])
            .then(function() {
                return skillGroups;
            })
            .then(utils.setFieldForObject(admin, 'skillGroups'));
    };
}