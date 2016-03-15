'use strict';

var skillResource = require('../../resource/skill.resource');
var skillGroupResource = require('../../resource/skillGroup.resource');
var utils = require('../../utils/utils');

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
        return skillResource.getAllSkills(headers)
            .then(function(skills) {
                model.skills = skills;
                return model;
            });
    };
}

function loadSkillGroups(headers) {
    return function(model) {
        return skillGroupResource.getAllSkillGroups(headers)
            .then(function(skillGroups) {
                model.skillGroups = skillGroups;
                return model;
            });
    };
}
