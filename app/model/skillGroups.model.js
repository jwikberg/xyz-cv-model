'use strict';

var skillResource = require('../resource/skill.resource');
var skillGroupResource = require('../resource/skillGroup.resource');
var utils = require('../utils/utils');

var Promise = require('bluebird');

function getSkillGroupsTemplate() {
    return new Promise(function(resolve) {
        var template = {
            skills: [],
            skillGroups: []
        };
        return resolve(template);
    });
}

exports.getSkillGroupsModel = function(headers) {
    return getSkillGroupsTemplate()
        .then(loadSkills(headers))
        .then(loadSkillGroups(headers));
};

function loadSkills(headers) {
    return function(model) {
        var skills = skillResource.getAllSkills(headers);
        return Promise.all([skills])
            .then(function() {
                model.skills = skills.value();
                return model;
            });
    };
}

function loadSkillGroups(headers) {
    return function(model) {
        var skillGroups = skillGroupResource.getAllSkillGroups(headers);
        return Promise.all([skillGroups])
            .then(function() {
                model.skillGroups = skillGroups.value();
                return model;
            });
    };
}
