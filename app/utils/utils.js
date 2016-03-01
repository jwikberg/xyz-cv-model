'use strict';

var Promise = require('bluebird');
var cacheHandler = require('./cache.handler');
var _ = require('underscore');

exports.extractPropertiesFromConnectors = function(property, connectors, extraProps) {
    return new Promise(function(resolve) {
        var list = [];
        connectors.forEach(function(connector) {
            var object = {};
            object._id = connector[property];
            if (extraProps) {
                extraProps.forEach(function(prop) {
                    object[prop] = connector[prop];
                });
            }

            list.push(object);
        });

        return resolve(list);
    });
};

exports.extractOneFromItems = function(items) {
    return new Promise(function(resolve) {
        if(items.length) {
            return resolve(items[0]);
        }
        return resolve(null);
    });
};

exports.matchListAndObjectIds = function(list) {
    return function(objects) {
        return new Promise(function(resolve) {
            var items = [];
            objects.forEach(function(object) {
                list.some(function(item) {
                    if (object._id === item._id) {
                        items.push(mergeProperties(object, item));
                        return true;
                    }

                });
            });

            Promise.all(items)
                .then(resolve);
        });
    };
};

exports.matchIdsAndObjects = function(ids, objects) {
    return new Promise(function(resolve) {
        var items = [];
        ids.forEach(function(id) {
            objects.some(function(object) {
                if (object._id === id) {
                    items.push(object);
                    return true;
                }

            });
        });

        Promise.all(items)
            .then(resolve);
    });
};

exports.sortListByProperty = function(prop) {
    return function(list) {
        return new Promise(function(resolve) {
            list.sort(function(a, b) {
                if (typeof a[prop] === 'string' && typeof b[prop] === 'string') {
                    if (a[prop].toUpperCase() > b[prop].toUpperCase()) {
                        return 1;
                    }

                    if (a[prop].toUpperCase() < b[prop].toUpperCase()) {
                        return -1;
                    }

                    return 0;
                } else {
                    if (a[prop] > b[prop]) {
                        return 1;
                    }

                    if (a[prop] < b[prop]) {
                        return -1;
                    }

                    return 0;
                }

            });

            return resolve(list);
        });
    };
};

exports.reverseList = function(list) {
    return new Promise(function(resolve) {
        return resolve(list.reverse());
    });
};

exports.setFieldForObject = function(object, fieldName) {
    return function(field) {
        return new Promise(function(resolve) {
            object[fieldName] = field;
            return resolve(object);
        });
    };
};

exports.addFieldsFromObjects = function(set, fields, collectionId) {
    return function(objects) {
        return new Promise(function(resolve) {
            objects.forEach(function(object) {
                fields.forEach(function(field) {
                    if (object[field]) {
                        set[object[field]] = true;
                        var  objectForCache = {};
                        objectForCache[collectionId] = [object._id];
                        cacheHandler.softsetToTagObjectCache(object[field], objectForCache);
                    }
                });
            });

            return resolve(set);
        });
    };
};

exports.convertSetToList = function(set) {
    return new Promise(function(resolve) {
        var list = [];
        for (var element in set) {
            list.push(element);
        }

        return resolve(list);
    });
};

exports.uniq = function(array) {
    var seen = {};
    return array.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
};

exports.setUrls = function(url) {
    return function(objects) {
        return new Promise(function(resolve) {
            objects.forEach(function(object) {
                object.url = url + object._id;
            });

            return resolve(objects);
        });
    };
};

exports.setUrl = function(url) {
    return function(object) {
        return new Promise(function(resolve) {
            object.url = url + object._id;
            return resolve(object);
        });
    };
};

function intersectionObjects2(a, b, areEqualFunction) {
    var results = [];

    for (var i = 0; i < a.length; i++) {
        var aElement = a[i];
        var existsInB = _.any(b, function(bElement) {
            return areEqualFunction(bElement, aElement);
        });

        if (existsInB) {
            results.push(aElement);
        }
    }

    return results;
}

exports.intersectionObjects = function(lists) {
    return new Promise(function(resolve) {
        var results = lists[0];
        var lastArgument = lists[lists.length - 1];
        var arrayCount = lists.length;
        var areEqualFunction = equalFunction;

        for (var i = 1; i < arrayCount ; i++) {
            var array = lists[i];
            results = intersectionObjects2(results, array, areEqualFunction);
            if (results.length === 0) {
                break;
            }
        }

        return resolve(results);
    });
};

exports.spreadLists = function(lists) {
    return new Promise(function(resolve, reject) {
        return resolve([].concat.apply([], lists));
    });
};

exports.logThen = function(phrase) {
    return function(value) {
        return new Promise(function(resolve) {
            console.log(phrase);
            return resolve(value);
        });
    };
};

exports.timeEndThen = function(label) {
    return function(value) {
        return new Promise(function(resolve) {
            console.timeEnd(label);
            return resolve(value);
        });
    };
};

exports.timeThen = function(label) {
    return function(value) {
        return new Promise(function(resolve) {
            console.time(label);
            return resolve(value);
        });
    };
};

// HELPER
// ============================================================================

function equalFunction(item1, item2) {
    return item1._id === item2._id;
}

function listContainsId(list, id) {
    return list.indexOf(id) > -1;
}

function mergeProperties(from, to) {
    return new Promise(function(resolve) {
        for (var prop in from) {
            if (from.hasOwnProperty(prop)) {
                to[prop] = from[prop];
            }
        }

        return resolve(to);
    });
}
