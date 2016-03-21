'use strict';

var officeResource = require('../../resource/office.resource');
var userResource = require('../../resource/user.resource');
var roleResource = require('../../resource/role.resource');
var skillResource = require('../../resource/skill.resource');
var skillGroupResource = require('../../resource/skillGroup.resource');
var languageResource = require('../../resource/language.resource');
var otherResource = require('../../resource/other.resource');
var fileResource = require('../../resource/file.resource');
var assignmentResource = require('../../resource/assignment.resource');
var certificateResource = require('../../resource/certificate.resource');
var courseResource = require('../../resource/course.resource');
var domainResource = require('../../resource/domain.resource');
var customerResource = require('../../resource/customer.resource');
var userToAssignmentResource = require('../../resource/userToAssignmentConnector.resource');
var userToCertificateResource = require('../../resource/userToCertificateConnector.resource');
var userToOfficeResource = require('../../resource/userToOfficeConnector.resource');
var attributeResource = require('../../resource/attribute.resource');
var roleToAttributeResource = require('../../resource/roleToAttributeConnector.resource');
var userToSkillResource = require('../../resource/userToSkillConnector.resource');
var userToLanguageResource = require('../../resource/userToLanguageConnector.resource');
var userToOtherResource = require('../../resource/userToOtherConnector.resource');
var userToCourseResource = require('../../resource/userToCourseConnector.resource');
var utils = require('../../utils/utils');
var fs = require('fs');
var Docxtemplater = require('docxtemplater');
var ImageModule = require('docxtemplater-image-module');
var request = require('request-promise');
var config = require('config');

var Promise = require('bluebird');

function loadDoc() {
    return function(user) {
        //Load the docx file as a binary
        var content = fs.readFileSync(__dirname + '/cvTemplate.docx', 'binary');

        //Settings for the image module
        var opts = {};
        opts.centered = false;
        opts.getImage = function(tagValue, tagName) {
            return tagValue;
        };

        opts.getSize = function(img, tagValue, tagName) {
            return [232, 232];
        };

        var imageModule = new ImageModule(opts);

        var doc = new Docxtemplater(content)
            .attachModule(imageModule);

        var skillGroups = [];
        var expertise = [];
        var experience = [];
        var assignments = [];
        var certificates = [];
        var courses = [];

        //Add skills marked as experience/expertise to an array.
        user.skills.forEach(function(skill) {
            if (skill.expertise) {
                expertise.push(skill);
            }

            if (skill.experience) {
                experience.push(skill);
            }
        });

        //Add assignments to an array, limit the dates to 10 characters(YYYY-MM-DD) and add the skills  to a string.
        user.assignments.forEach(function(assignment) {
            var skills = '';
            assignment.skills.forEach(function(skill) {
                skills += skill.name + ', ';
            });

            if (skills !== '') {
                skills = skills.substring(0, (skills.length - 2)) + '.';
            }

            assignment.skills = skills;
            if (assignment.description) {
                assignment.description = assignment.description.replace(/(<([^>]+)>)/ig, '');
            }

            if (assignment.dateFrom) {
                assignment.dateFrom = assignment.dateFrom.substring(0, 10);
            }

            if (assignment.dateTo) {
                assignment.dateTo = assignment.dateTo.substring(0, 10);
            } else {
                assignment.dateTo = 'Ongoing';
            }

            assignments.push(assignment);
        });

        //Add certificates to an array and limit the dates to 4 characters(YYYY).
        user.certificates.forEach(function(certificate) {
            if (certificate.dateTo) {
                certificate.dateTo = certificate.dateTo.substring(0, 4);
            } else {
                certificate.dateTo = 'Ongoing';
            }

            certificates.push(certificate);
        });

        //Add courses to an array and limit the dates to 10 characters(YYYY-MM-DD).
        user.courses.forEach(function(course) {
            if (course.dateFrom) {
                course.dateFrom = course.dateFrom.substring(0, 10);
            }

            if (course.dateTo) {
                course.dateTo = course.dateTo.substring(0, 10);
            } else {
                course.dateTo = 'Ongoing';
            }

            courses.push(course);
        });

        //Add a skills string to each skill group and add them to an array.
        user.skillGroups.forEach(function(skillGroup) {
            skillGroup.skills = '';
            user.skills.forEach(function(skill) {
                if (skill.skillGroupId === skillGroup._id) {
                    if (skill.level >= 3 || skill.experience || skill.expertise) {
                        skillGroup.skills += skill.name + ', ';
                    }
                }
            });

            if (skillGroup.skills !== '') {
                skillGroup.skills = skillGroup.skills.substring(0, (skillGroup.skills.length - 2)) + '.';
                skillGroups.push(skillGroup);
            }
        });

        //Add uncategorized skills to an array.
        var uncategorized = {
            name: 'Other',
            skills: ''
        };
        user.skills.forEach(function(skill) {
            if (!skill.skillGroupId && (skill.level >= 3 || skill.experience || skill.expertise)) {
                uncategorized.skills += skill.name + ', ';
            }
        });

        if (uncategorized.skills !== '') {
            uncategorized.skills = uncategorized.skills.substring(0, (uncategorized.skills.length - 2)) + '.';
            skillGroups.push(uncategorized);
        }

        //Add empty strings for null values.
        if (!user.position) {
            user.position = '';
        }

        if (!user.office) {
            user.office = {
                name: '',
                phoneNumber: '',
                address: '',
                zipCode: '',
                city: '',
                country: ''
            };
        }

        //Set the template variables.
        doc.setData({
            name: user.name.toUpperCase(),
            position: user.position.toUpperCase(),
            office: user.office.name.toUpperCase(),
            phoneNumber: user.office.phoneNumber,
            address: user.office.address.toUpperCase(),
            zipCode: user.office.zipCode,
            city: user.office.city.toUpperCase(),
            country: user.office.country.toUpperCase(),
            summary: user.summary,
            description: user.description,
            expertise: expertise,
            experience: experience,
            skillGroups: skillGroups,
            assignments: assignments,
            certificates: certificates,
            languages: user.languages,
            courses: courses,
            others: user.others,
            profileImage: user.profileImage
        });

        //Apply the template variables (replace all occurences of {name} with user.name.toUpperCase(), etc.).
        doc.render();
        var buf = doc.getZip().generate({type:'base64'});

        user.word = buf;
        return user;
    };
}

function getExportCvTemplate() {
    return new Promise(function(resolve) {
        var template = {
            user: {}
        };
        return resolve(template);
    });
}

exports.getExportCvModelByUserId = function(id, headers) {
    return getExportCvTemplate()
        .then(loadUser(id, headers));
};

// USER
// ============================================================================

function loadUser(id, headers) {
    return function(model) {
        return userResource.getUserById(id, headers)
            .then(loadProfileImageForUser(headers))
            .then(loadSkillsForUser(headers))
            .then(loadSkillGroups(headers))
            .then(loadLanguagesForUser(headers))
            .then(loadOthersForUser(headers))
            .then(loadRoleForUser(headers))
            .then(loadAssignmentsForUser(headers))
            .then(loadCertificatesForUser(headers))
            .then(loadOfficeForUser(headers))
            .then(loadCoursesForUser(headers))
            .then(loadBinaryProfileImageForUser(headers))
            .then(loadDoc())
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

function loadDomainForCertificates(headers, domains) {
    return function(certificates) {
        return Promise.each(certificates, function(certificate) {
            return utils.matchIdsAndObjects([certificate.domain], domains)
                .then(utils.extractOneFromItems)
                .then(utils.setFieldForObject(certificate, 'domain'));
        });
    };
}

// Certificates
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
            var skills = skillResource.getAllSkills(headers);
            var customers = customerResource.getAllCustomers(headers);
            var domains = domainResource.getAllDomains(headers);
            return Promise.all([skills, customers, domains])
                .then(function() {
                    skills = skills.value();
                    customers = customers.value();
                    domains = domains.value();
                    return loadSkillsForCertificates(headers, skills)(certificates)
                        .then(loadCustomerForCertificates(headers, customers))
                        .then(loadDomainForCertificates(headers, domains))
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

function loadCustomerForCertificates(headers, customers) {
    return function(certificates) {
        return Promise.each(certificates, function(certificate) {
            return utils.matchIdsAndObjects([certificate.customer], customers)
                .then(utils.extractOneFromItems)
                .then(utils.setFieldForObject(certificate, 'customer'));
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

function loadBinaryProfileImageForUser(headers) {
    return function(user) {
        if (!user.profileImage) {
            user.profileImage = fs.readFileSync(__dirname + '/noProfileImage.png', 'binary');
            return user;
        } else {
            var options = {
                uri: config.API_URL + 'file/thumbnail/' + user.profileImage.generatedName,
                encoding: null,
                headers: headers
            };

            return request(options)
                .then(function(profileImage) {
                    user.profileImage = profileImage;
                    return user;
                });
        }
    };
}
