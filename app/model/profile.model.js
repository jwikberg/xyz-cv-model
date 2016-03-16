'use strict';

var officeResource = require('../resource/office.resource');
var userResource = require('../resource/user.resource');
var roleResource = require('../resource/role.resource');
var skillResource = require('../resource/skill.resource');
var languageResource = require('../resource/language.resource');
var otherResource = require('../resource/other.resource');
var skillGroupResource = require('../resource/skillGroup.resource');
var fileResource = require('../resource/file.resource');
var assignmentResource = require('../resource/assignment.resource');
var certificateResource = require('../resource/certificate.resource');
var courseResource = require('../resource/course.resource');
var domainResource = require('../resource/domain.resource');
var customerResource = require('../resource/customer.resource');
var userToAssignmentResource = require('../resource/userToAssignmentConnector.resource');
var userToCertificateResource = require('../resource/userToCertificateConnector.resource');
var userToOfficeResource = require('../resource/userToOfficeConnector.resource');
var attributeResource = require('../resource/attribute.resource');
var roleToAttributeResource = require('../resource/roleToAttributeConnector.resource');
var userToSkillResource = require('../resource/userToSkillConnector.resource');
var userToLanguageResource = require('../resource/userToLanguageConnector.resource');
var userToOtherResource = require('../resource/userToOtherConnector.resource');
var userToCourseResource = require('../resource/userToCourseConnector.resource');
var utils = require('../utils/utils');

var Promise = require('bluebird');

function getProfileTemplate() {
    return new Promise(function(resolve) {
        var template = {
            user: {}
        };
        return resolve(template);
    });
}

exports.getProfileModelByUserId = function(id, headers) {
    return getProfileTemplate()
        .then(loadUser(id, headers))
        .then(loadCloud);
};

exports.getCurrentProfileModel = function(headers) {
    return getProfileTemplate()
        .then(loadCurrentUser(headers))
        .then(loadCloud);
};

// USER
// ============================================================================

function loadUser(id, headers) {
    return function(model) {
        return userResource.getUserById(id, headers)
            .then(loadProfileImageForUser(headers))
            .then(loadSkillsForUser(headers))
            .then(loadLanguagesForUser(headers))
            .then(loadOthersForUser(headers))
            .then(loadSkillGroups(headers))
            .then(loadRoleForUser(headers))
            .then(loadAssignmentsForUser(headers))
            .then(loadCertificatesForUser(headers))
            .then(loadOfficeForUser(headers))
            .then(loadCoursesForUser(headers))
            .then(utils.setFieldForObject(model, 'user'));
    };
}

function loadCurrentUser(headers) {
    return function(model) {
        return userResource.getCurrentUser(headers)
            .then(loadProfileImageForUser(headers))
            .then(loadSkillsForUser(headers))
            .then(loadLanguagesForUser(headers))
            .then(loadOthersForUser(headers))
            .then(loadSkillGroups(headers))
            .then(loadRoleForUser(headers))
            .then(loadAssignmentsForUser(headers))
            .then(loadCertificatesForUser(headers))
            .then(loadOfficeForUser(headers))
            .then(loadCoursesForUser(headers))
            .then(utils.setFieldForObject(model, 'user'));
    };
}

// SKILLS
// ============================================================================

function loadSkillsForUser(headers) {
    return function(user) {
        var connectors = userToSkillResource.getUserToSkillConnectorsByUserId(user._id, headers);
        var skills = skillResource.getAllSkills(headers);
        return Promise.all([connectors, skills])
            .then(function() {
                return matchSkillsAndConnectors(skills.value(), connectors.value());
            })
            .then(utils.sortListByProperty('level'))
            .then(utils.reverseList)
            .then(utils.setFieldForObject(user, 'skills'));
    };
}

function matchSkillsAndConnectors(skills, connectors) {
    return utils.extractPropertiesFromConnectors('skillId', connectors, ['level', 'futureLevel', 'years', 'updatedAt', 'expertise', 'experience'])
        .then(utils.matchListAndObjectIds(skills));
}

// SKILLGROUPS
// ============================================================================

function loadSkillGroups(headers) {
    return function(user) {
        return skillGroupResource.getAllSkillGroups(headers)
            .then(utils.setFieldForObject(user, 'skillGroups'));
    };
}

// LANGUAGES
// ============================================================================

function loadLanguagesForUser(headers) {
    return function(user) {
        var connectors = userToLanguageResource.getUserToLanguageConnectorsByUserId(user._id, headers);
        var languages = languageResource.getAllLanguages(headers);
        return Promise.all([connectors, languages])
            .then(function() {
                return matchLanguagesAndConnectors(languages.value(), connectors.value());
            })
            .then(utils.sortListByProperty('name'))
            .then(utils.setFieldForObject(user, 'languages'));
    };
}

function matchLanguagesAndConnectors(languages, connectors) {
    return utils.extractPropertiesFromConnectors('languageId', connectors, ['level'])
        .then(utils.matchListAndObjectIds(languages));
}

// OTHER
// ============================================================================

function loadOthersForUser(headers) {
    return function(user) {
        var connectors = userToOtherResource.getUserToOtherConnectorsByUserId(user._id, headers);
        var others = otherResource.getAllOthers(headers);
        return Promise.all([connectors, others])
            .then(function() {
                return matchOthersAndConnectors(others.value(), connectors.value());
            })
            .then(utils.sortListByProperty('year'))
            .then(utils.reverseList)
            .then(utils.setFieldForObject(user, 'others'));
    };
}

function matchOthersAndConnectors(others, connectors) {
    return utils.extractPropertiesFromConnectors('otherId', connectors, ['year'])
        .then(utils.matchListAndObjectIds(others));
}

// ROLE
// ============================================================================

function loadRoleForUser(headers) {
    return function(user) {
        return roleResource.getRoleByName(user.role, headers)
            .then(utils.setFieldForObject(user, 'role'));
    };
}

// OFFICE
// ============================================================================

function loadOfficeForUser(headers) {
    return function(user) {
        return userToOfficeResource.getUserToOfficeConnectorsByUserId(user._id, headers)
            .then(function(connectors) {
                var connector = connectors[0];
                if (connector) {
                    return officeResource.getOfficeById(connector.officeId, headers)
                        .then(utils.setFieldForObject(user, 'office'));
                }

                return utils.setFieldForObject(user, 'office')(null);
            });
    };
}

// ASSIGNMENTS
// ============================================================================

function loadAssignmentsForUser(headers) {
    return function(user) {
        var connectors = userToAssignmentResource.getUserToAssignmentConnectorsByUserId(user._id, headers);
        var assignments = assignmentResource.getAllAssignments(headers);
        return Promise.all([connectors, assignments])
            .then(function() {
                return matchAssignmentsAndConnectors(assignments.value(), connectors.value())
                    .then(loadAssignmentSubEntities(headers));
            })
            .then(utils.setFieldForObject(user, 'assignments'));
    };
}

function matchAssignmentsAndConnectors(assignments, connectors) {
    return utils.extractPropertiesFromConnectors('assignmentId', connectors, ['skills', 'dateFrom', 'dateTo', 'description', 'updatedAt'])
        .then(utils.matchListAndObjectIds(assignments));
}

function loadAssignmentSubEntities(headers) {
    return function(assignments) {
        return new Promise(function(resolve) {
            var skills = skillResource.getAllSkills(headers);
            var customers = customerResource.getAllCustomers(headers);
            var domains = domainResource.getAllDomains(headers);
            return Promise.all([skills, customers, domains])
                .then(function() {
                    skills = skills.value();
                    customers = customers.value();
                    domains = domains.value();
                    return loadSkillsForAssignments(headers, skills)(assignments)
                        .then(loadCustomerForAssignments(headers, customers))
                        .then(loadDomainForAssignments(headers, domains))
                        .then(resolve);
                });
        });
    };
}

function loadSkillsForAssignments(headers, skills) {
    return function(assignments) {
        return Promise.each(assignments, function(assignment) {
            return utils.matchIdsAndObjects(assignment.skills, skills)
                .then(utils.setFieldForObject(assignment, 'skills'));
        });
    };
}

function loadCustomerForAssignments(headers, customers) {
    return function(assignments) {
        return Promise.each(assignments, function(assignment) {
            return utils.matchIdsAndObjects([assignment.customer], customers)
                .then(utils.extractOneFromItems)
                .then(utils.setFieldForObject(assignment, 'customer'));
        });
    };
}

function loadDomainForAssignments(headers, domains) {
    return function(assignments) {
        return Promise.each(assignments, function(assignment) {
            return utils.matchIdsAndObjects([assignment.domain], domains)
                .then(utils.extractOneFromItems)
                .then(utils.setFieldForObject(assignment, 'domain'));
        });
    };
}

// CERTIFICATES
// ============================================================================

function loadCertificatesForUser(headers) {
    return function(user) {
        var connectors = userToCertificateResource.getUserToCertificateConnectorsByUserId(user._id, headers);
        var certificates = certificateResource.getAllCertificates(headers);
        return Promise.all([connectors, certificates])
            .then(function() {
                return matchCertificatesAndConnectors(certificates.value(), connectors.value())
                    .then(loadCertificateSubEntities(headers));
            })
            .then(utils.setFieldForObject(user, 'certificates'));
    };
}

function matchCertificatesAndConnectors(certificates, connectors) {
    return utils.extractPropertiesFromConnectors('certificateId', connectors, ['skills', 'dateFrom', 'dateTo', 'description', 'updatedAt'])
        .then(utils.matchListAndObjectIds(certificates));
}

function loadCertificateSubEntities(headers) {
    return function(certificates) {
        return new Promise(function(resolve) {
            return skillResource.getAllSkills(headers)
                .then(function(skills) {
                    return loadSkillsForCertificates(headers, skills)(certificates)
                        .then(resolve);
                });
        });
    };
}

function loadSkillsForCertificates(headers, skills) {
    return function(certificates) {
        return Promise.each(certificates, function(certificate) {
            return utils.matchIdsAndObjects(certificate.skills, skills)
                .then(utils.setFieldForObject(certificate, 'skills'));
        });
    };
}

// COURSES
// ============================================================================

function loadCoursesForUser(headers) {
    return function(user) {
        var connectors = userToCourseResource.getUserToCourseConnectorsByUserId(user._id, headers);
        var courses = courseResource.getAllCourses(headers);
        return Promise.all([connectors, courses])
            .then(function() {
                return matchCoursesAndConnectors(courses.value(), connectors.value());
            })
            .then(utils.sortListByProperty('dateTo'))
            .then(utils.reverseList)
            .then(utils.setFieldForObject(user, 'courses'));
    };
}

function matchCoursesAndConnectors(courses, connectors) {
    return utils.extractPropertiesFromConnectors('courseId', connectors, ['dateTo', 'dateFrom'])
        .then(utils.matchListAndObjectIds(courses));
}

// PROFILE IMAGE
// ============================================================================

function loadProfileImageForUser(headers) {
    return function(user) {
        return new Promise(function(resolve) {
            if (!user.profileImage) {
                return resolve(user);
            } else {
                return fileResource.getFileById(user.profileImage, headers)
                    .then(utils.setFieldForObject(user, 'profileImage'))
                    .then(resolve);
            }
        });
    };
}

// CLOUD
// ============================================================================

function loadCloud(model) {
    return loadCloudMap({}, model)
        .then(loadCloudWords)
        .then(loadCloudMaxWeight)
        .then(setOpacityForWords)
        .then(utils.setFieldForObject(model, 'cloud'));

}

function loadCloudMap(cloud, model) {
    return loadMapSkills(model)({})
        .then(loadMapAssignments(model))
        .then(loadMapGeneralInfo(model))
        .then(loadMapCertificates(model))
        .then(utils.setFieldForObject(cloud, 'map'));
}

function loadCloudWords(cloud) {
    return getWordsFromMap(cloud.map)
        .then(utils.sortListByProperty('weight'))
        .then(utils.reverseList)
        .then(utils.setFieldForObject(cloud, 'words'));
}

function loadCloudMaxWeight(cloud) {
    return getMaxWeightFromWords(cloud.words)
        .then(utils.setFieldForObject(cloud, 'maxWeight'));
}

function getWordsFromMap(map) {
    return new Promise(function(resolve) {
        var words = [];
        for (var prop in map) {
            if (map.hasOwnProperty(prop)) {
                var word = map[prop];
                words.push(word);
            }
        }

        return resolve(words);
    });
}

function getMaxWeightFromWords(words) {
    return new Promise(function(resolve) {
        var maxWeight = 1;
        words.forEach(function(word) {
            if (maxWeight < word.weight) {
                maxWeight = word.weight;
            }
        });

        return resolve(maxWeight);
    });
}

function setOpacityForWords(cloud) {
    return new Promise(function(resolve) {
        cloud.words.forEach(function(word) {
            word.opacity = word.weight / cloud.maxWeight;
        });

        return resolve(cloud);
    });
}

function loadMapSkills(model) {
    return function(map) {
        return new Promise(function(resolve) {
            model.user.skills.forEach(function(skill) {
                if (map[skill.name]) {
                    return;
                }

                var word = {};
                word.text = skill.name;
                word.weight = skill.level;
                map[word.text] = word;
            });

            return resolve(map);
        });
    };
}

function loadMapAssignments(model) {
    return function(map) {
        return new Promise(function(resolve) {
            model.user.assignments.forEach(function(assignment) {
                if (map[assignment.name]) {
                    map[assignment.name].weight += 1;
                    return;
                }

                var word = {};
                word.text = assignment.name;
                word.weight = 1;
                map[assignment.name] = word;
                assignment.skills.forEach(function(skill) {
                    if (map[skill.name]) {
                        map[skill.name].weight += 1;
                        return;
                    }

                    var word = {};
                    word.text = skill.name;
                    word.weight = 1;
                    map[skill.name] = word;
                });
            });

            return resolve(map);
        });
    };
}

function loadMapCertificates(model) {
    return function(map) {
        return new Promise(function(resolve) {
            model.user.certificates.forEach(function(certificate) {
                if (map[certificate.name]) {
                    map[certificate.name].weight += 1;
                    return;
                }

                var word = {};
                word.text = certificate.name;
                word.weight = 1;
                map[certificate.name] = word;
                certificate.skills.forEach(function(skill) {
                    if (map[skill.name]) {
                        map[skill.name].weight += 1;
                        return;
                    }

                    var word = {};
                    word.text = skill.name;
                    word.weight = 1;
                    map[skill.name] = word;
                });
            });

            return resolve(map);
        });
    };
}

function loadMapGeneralInfo(model) {
    return function(map) {
        return new Promise(function(resolve) {
            if (model.user.office) {
                map[model.user.office.name] = {text: model.user.office.name, weight: 1};
            }

            if (model.user.country) {
                map[model.user.country] = {text: model.user.country, weight: 1};
            }

            if (model.user.role) {
                map[model.user.role.name] = {text: model.user.role.name, weight: 1};
            }

            return resolve(map);
        });
    };
}
