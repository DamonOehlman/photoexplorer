(function() {
    var BACKGROUND_FILLSTYLE = '#1f1c24';
        
    var flickrTileSize = 240,
        imagePadding = 10,
        tileSize = flickrTileSize + imagePadding * 2,
        tiler = null,
        overlay = null,
        photoPanel = null,
        actionBar = null,
        mainPanel = null,
        tileGrid = null,
        mode = 'search',
        imagesPerSide = 0, 
        searchText = '',
        pageIndex = 1, 
        backgroundTile = null,
        displayedPageCount = 0,
        assignedPhotos = [],
        queuedPhotos = [],
        photoSources = null,
        photoSourceList = null,
        populatedTiles = [],
        photoIndex = 0,
        knownUsers = {},
        emptyTile = null,
        tileBorder = null,
        selectedPhoto = null,
        searching = false,
        offsetBases = {},
        monitorQueue = [],
        checkingQueue = false,
        noMoreResults = false,
        plugins = [],
        foundModifiers = [],
        currentImage = null,
        userSearchOptions = {};
    /*
    // var the faves storage
    var faves = new Lawnchair({ 
        table: 'photogridfaves',
        adaptor: /webkit/i.test(navigator.userAgent) ? 'webkit' : 'dom'
    });
    */
    
    /* initialise the mode handlers */
    
    var modeHandlers = {
        interesting: function() {
            resetState();
            
            modeMethod = METHOD_GET_INTERESTING;
            queryFlickr();
        },
        
        search: function() {
            Ext.Msg.prompt("Flickr Photo Search", "Enter keywords to search for", function(value) {
                resetState();

                searchText = value;
                queryFlickr();
            });
        },
        
        recent: function() {
            resetState();
            
            modeMethod = METHOD_RECENT;
            queryFlickr();
        }
    };
    
    /* internal functions */
    
    function cancelSearch(message) {
        resetState();
        
        alert(message);
    } // cancelSearch
    
    function drawBackground(context) {
        context.fillStyle = BACKGROUND_FILLSTYLE;
        context.fillRect(0, 0, tileSize, tileSize);
    } // drawBackground
    
    function drawTile(context, imageData) {
        var image = imageData.image, 
            x = ~~((tileSize - image.width) / 2),
            y = ~~((tileSize - image.height) / 2);
            
        context.shadowOffsetX = 0;  
        context.shadowOffsetY = 2;
        context.shadowBlur = 4;  
        context.shadowColor = "rgba(0, 0, 0, 0.5)";
            
        context.strokeStyle = "#FFF";
        context.lineWidth = 6;
        context.beginPath();
        context.rect(x, y, image.width, image.height);
        context.stroke();
        
        context.shadowOffsetX = 0;  
        context.shadowOffsetY = 0;
        context.shadowBlur = 0;  
        context.drawImage(image, x, y);
    } // drawTile
    
    function getSearchParams() {
        var params = "",
            searchTerm = searchText;
            
        // iterate through the found modifiers and remove
        for (var ii = 0; ii < foundModifiers.length; ii++) {
            searchTerm = searchTerm.replace(foundModifiers[ii], "");
        } // for
            
        if (searchTerm) {
            params += '&text=' + searchTerm;
        } // if
        
        for (var key in searchOptions) {
            if (searchOptions[key]) {
                params += '&' + key + '=' + searchOptions[key];
            } // if
        } // for
        
        return params;
    } // getSearchParams
    
    function parseSearchParams(callback) {
        var rules = new COG.ParseRules();
        
        // reset the discovered modifiers
        foundModifiers = [];
        
        // look for the user specified
        rules.add(/user\:(.+)/i, function(matches, receiver, callback) {
            foundModifiers.push(matches[0]);
            
            var userId = knownUsers[matches[1]];
            if (userId) {
                receiver.user_id = userId;
                callback();
            }
            else {
                var url = URL_BASE + '&method=flickr.people.findByUsername' + 
                    '&username=' + matches[1].replace(/\s/g, "+");

                COG.jsonp(url, function(data) {
                    if (data.user) {
                        receiver.user_id = data.user.id;
                        knownUsers[matches[1]] = receiver.user_id;
                        
                        callback();
                    }
                    else {
                        cancelSearch("User not found");
                    }
                }, "jsoncallback");
            } // if..else
        });
        
        searchOptions = COG.extend(userSearchOptions, DEFAULT_SEARCH_OPTIONS);
        rules.each(searchText, searchOptions, callback);
    } // parseSearchParams
    
    function createBackgroundTile() {
        backgroundTile = document.createElement('canvas');
        backgroundTile.width = tileSize;
        backgroundTile.height = tileSize;
        
        var context = backgroundTile.getContext('2d');
        
        context.fillStyle = BACKGROUND_FILLSTYLE;
        context.fillRect(0, 0, tileSize, tileSize);
    } // createBackgroundTile
    
    function resetState() {
        if (tileGrid) {
            tiler.cleanup();
            tileGrid = null;
        } // if
        
        mode = 'search';
        pageIndex = 1;
        searchText = "";
        noMoreResults = false;
        queuedPhotos = [];
        assignedPhotos = [];
        populatedTiles = [];
        selectedPhoto = null;
        searching = false;
        
        // reset the position of the tiler back to the origin
        tiler.updateOffset(0, 0);
    } // resetState
    
    function updatePhotoTools() {
    } // updatePhotoTools
    
    function updateStatus(message) {
    } // updateStatus
    
    function usernameToUserIdParam(matches) {
        return function(callback) {
        };
    } // usernameToUserIdParam
    
    /* event handlers */
    
    function loadFavorites() {
        resetState();
        
        // set autofill to false
        mode = 'faves';
        
        // load the favourites
        faves.each(function(photo) {
            queuedPhotos.push(photo);
        }); // each
    } // loadFavorites
    
    function runSearch() {
        resetState();
        searchText = Ext.getCmp('searchfield').getValue();
        
        Ext.getCmp('photoContainer').setCard(0);
        mainPanel.setCard(0);

        queryFlickr();
    } // runSearch
    
    function viewRandomTile() {
        var populatedTiles = [],
            selectedTile = null,
            counter = 0;

        Ext.getCmp('photoContainer').setCard(0);
        mainPanel.setCard(0);
        
        tileGrid.find(function(tile) {
            if (tile.photoIndex && tile.url) {
                populatedTiles.push(tile);
            } // if

            // don't return anything, and we will iterate through all non null tiles :)
        });

        if (populatedTiles.length > 0) {
            selectedTile = populatedTiles[Math.floor(Math.random() * populatedTiles.length)];
        } // if

        if (selectedTile) {
            tiler.centerOn(selectedTile, T5.easing('back.out'), 1200);
        } // if
    }
    
    function updatePhotoDetails(tileIndex, coreData, extraData) {
        var html = '<h2>' + (coreData.title ? coreData.title : 'Untitled') + '</h2>',
            photoPage = 'http://www.flickr.com/photos/' + selectedPhoto.owner + '/' + selectedPhoto.id;
        
        html += '<img src="' + getPhotoUrl(tileIndex, Ext.is.Phone ? 'm' : undefined) + '" />';
        if (extraData) {
            
        } // if
        
        html += '<p class="linkback"><a href="' + photoPage + '" target="_blank">View on Flickr</a></p>';
        
        Ext.getCmp('photoDetails').update(html);
    } // updatePhotoDetails
    
    function viewTilePhoto(evt, tappedImages, absXY, relXY, offsetXY) {
        COG.Log.info('tapped images: ', tappedImages[0]);
        
        /*
        var tileIndex = tile ? tile.photoIndex : undefined;
        if (typeof tileIndex !== 'undefined') {
            selectedPhoto = assignedPhotos[tileIndex];
            globalPhoto = selectedPhoto;
            if (selectedPhoto) {
                var photoUrl = getPhotoUrl(tileIndex, Ext.is.Phone ? 'm' : undefined);
                
                Ext.getBody().mask(false, '<div class="loading">Loading&hellip;</div>');
                
                T5.Images.load(photoUrl, function() {
                    updatePhotoDetails(tileIndex, selectedPhoto);
                     Ext.getBody().unmask();

                    Ext.getCmp('photoContainer').setCard('photoDetails');
                    getPhotoInfo(selectedPhoto.id, function(data) {
                        updatePhotoDetails(tileIndex, selectedPhoto, data);
                    });
                }); // load image
            } // if
        } // if
        */
    } // handleTap
        
    /* private functions */
    
    function handleMainPanelResize(panel, panelWidth, panelHeight) {
        COG.Log.info("got resize: width = " + width + ", height = " + height);
    } // handlePanelResize
    
    function initPhotoGrid() {
        if (Ext.is.Phone) {
            flickrTileSize = 100;
            imagePadding = 5;
            tileSize = flickrTileSize + imagePadding * 2;
        } // if

        tiler = new T5.View({
            container: 'photos',
            scalable: false
        });
        
        var photoLayer = tiler.setLayer('photos', new T5.ImageLayer('flickr', {
            apikey: 'e3a9e747b4964d7872a3a8976ff408b2',
            tileHeight: tileSize,
            tileWidth: tileSize,
            imageLoadArgs: {
                offset: new T5.Vector(10, 10),
                drawBackground: drawBackground,
                customDraw: drawTile,
                realSize: {
                    width: tileSize,
                    height: tileSize
                }
            }
        }));
        
        photoLayer.bind('tapImage', viewTilePhoto);
    } // initMap
    
    function buildPhotoSourceList() {
        Ext.regModel('PhotoSource', {
            fields: [
                { name: 'group', type: 'string' },
                { name: 'title', type: 'string' }
            ]
        });
        
        photoSources = new Ext.data.JsonStore({
            model: 'PhotoSource',
            sorters: 'group',
            
            getGroupString: function(record) {
                return record.get('group')[0];
            },
            
            data: [{
                group: 'Flickr',
                title: 'Interesting'
            }, {
                group: 'Flickr',
                title: 'Recent'
            }]
        });
        
        photoSourceList = new Ext.List({
            dock: 'left',
            ui: 'midnight',
            itemTpl: '{group} - {title}',
            grouped: false,
            style: 'text-align: left;',
            
            store: photoSources
        });
    } // buildPhotoSourceList
    
    function buildToolbar() {
        var searchField = new Ext.form.Search({
            id: 'searchfield',
            name: 'search',
            placeHolder: 'Search'
        });
        
        searchField.addListener('keyup', function(field, e) {
            var key = e.browserEvent.keyCode;
            if ((! key) || (key === 13)) {
                runSearch();
            } // if
        });
        
        var tapHandler = function(button, event) {
            var handler = modeHandlers[button.text.toLowerCase()];
            if (handler) {
                Ext.getCmp('photoContainer').setCard(0);
                handler();
            } // if
        };
        
        var goBack = function(button, event) {
            Ext.getCmp('photoContainer').setCard(0);
        }; // goBack
            
        actionBar = new Ext.Toolbar({
            dock: 'top',
            xtype: 'toolbar',
            ui: 'dark',
            defaults: {
                iconMask: true
            },
            layout: {
                pack: 'justify'
            },
            items : [{
                text: 'Back',
                ui: 'back',
                id: 'goback',
                disabled: true,
                handler: goBack
            }, {
               xtype: 'spacer'
            }, {
               xtype: 'panel',
               html: '<h1>Photo Explorer</h1>'
            }, {
               xtype: 'spacer' 
            }, {
                text: 'Random',
                handler: viewRandomTile
            }]
        });
    } // buildToolbar
        
    function buildPhotoPanel() {
        photoPanel = new Ext.Panel({
            html: '<canvas id="photos"></canvas>',
            dockedItems: [photoSourceList],
            cls: 'card',
            layout: 'fit'
        });
        
        // attach the panel listeners
        photoPanel.addListener('afterrender', function() {
            initPhotoGrid();
        });

        photoPanel.addListener('afterlayout', function() {
            if (tiler) {
                tiler.resize(this.getWidth(), this.getHeight());
            } // if
        });
    } // initMapPanel
    
    /* pre load images */
    
    /*
    T5.Images.load("/media/img/flickr-overlay.png", function(image) {
        tileBorder = image;
    });
    
    */
    
    /* ext init */
    
    Ext.setup({
        icon: '/images/icon.png',
        tabletStartupScreen: '/images/tablet_startup.png',
        phoneStartupScreen: '/images/phone_startup.png',
        glossOnIcon: false,
        onReady: function() {
            // build the map panel
            buildToolbar();
            buildPhotoSourceList();
            buildPhotoPanel();
            
            overlay = new Ext.Panel({
                floating: true,
                modal: true,
                centered: false,
                width: Ext.is.Phone ? 260 : 400,
                height: Ext.is.Phone ? 220 : 400,
                styleHtmlContent: true,
                scroll: 'vertical'
            });            
            
            mainPanel = new Ext.TabPanel({
                tabBar: {
                    dock: 'bottom',
                    layout: {
                        pack: 'center'
                    }
                },
                dockedItems: [actionBar],
                fullscreen: true,
                ui: 'dark',
                animation: {
                    type: 'cardslide',
                    cover: true
                },

                defaults: {
                    scroll: false
                },
                items: [{
                    id: 'photoContainer',
                    title: 'Photos',
                    iconCls: 'photos',
                    layout: 'card',
                    animation: {
                        type: 'slide'
                    },
                    items: [photoPanel, {
                        id: 'photoDetails',
                        cls: 'card',
                        scroll: 'vertical'
                    }],
                    listeners: {
                        cardswitch: function(container, newCard, oldCard, index, animated) {
                            var backButton = Ext.getCmp('goback');
                            if (backButton) {
                                backButton[index === 0 ? 'disable' : 'enable'].apply(backButton);
                            } // if
                        }
                    }
                }, {
                        title: 'About',
                        contentEl: 'about',
                        iconCls: 'info',
                        cls: 'card'
                    }]
            });            
            
            T5.Images.avgImageSize = Ext.is.Phone ? 40 : 80;
        }
    });
})();
