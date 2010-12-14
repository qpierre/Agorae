(function($) {
  function Session() {
    function login(){
      $.showDialog("dialog/_login.html", {
        modal: true,
        load: function(dialog){
          //Load default setting from cookie
          var config = $.cookie('config') || 'http://localhost/agorae/config';
          var name = $.cookie('name') || '';
          var password = $.cookie('password') || '';
          var cookie = $.cookie('cookie') || '0';

          $(dialog).find('input[name="config"]').val(config).focus(function(){ $(this).select(); });
          $(dialog).find('input[name="name"]').val(name);
          $(dialog).find('input[name="password"]').val(password);
          if(cookie == '1')
            $(dialog).find('input[name="cookie"]').attr('checked', true);
          else
            $(dialog).find('input[name="cookie"]').removeAttr('checked');
        },
        submit: function(data, callback) {
          if (!validateLoginForm(data, callback)) return;
          $.agorae.login(data.config, data.name, data.password, callback, function(){
            if(data.cookie){
              $.cookie('cookie', '1');
              $.cookie('config', data.config);
              $.cookie('name', data.name);
              $.cookie('password', data.password);
            }
            else
            {
              $.cookie('cookie', '0');
              $.cookie('config', null);
              $.cookie('name', null);
              $.cookie('password', null);
            }
            $.cookie('session', JSON.stringify($.agorae.config), { expires: 1/24/3});
            $.agorae.session.route();
          });
        }
      });
      return false;
    };

    function validateLoginForm(data, callback) {
      if (!data.config || data.config.length == 0) {
        callback({
            config: "Please enter a correct configuration document URL."});
        return false;
      };
      if (!data.name || data.name.length == 0) {
        callback({name: "Please enter a name."});
        return false;
      };
      if (!data.password || data.password.length == 0) {
        callback({password: "Please enter a password."});
        return false;
      };
      return true;
    };

    this.logout = function(){
      $.cookie('session', null);
      self.location.href = './';
    };
    this.init = function(){
      if(!$.cookie('session'))
        login();
      else
      {
        $.agorae.config = JSON.parse($.cookie('session'));
        $.agorae.session.route();
      }
    };

    this.route = function(){
      $.agorae.pagehelper.init();

      if(!$.queryString('uri'))
      {
        $.showPage('page/_index.html', $.agorae.frontpage.init);
        return false;
      }
      var uri = $.queryString('uri');

      if(uri.indexOf('/viewpoint/') > 0)
      {
        $.showPage('page/_viewpoint.html', $.agorae.viewpointpage.init);
        return false;
      }
      if(uri.indexOf('/topic/') > 0)
      {
        $.showPage('page/_topic.html', $.agorae.topicpage.init);
        return false;
      }
      if(uri.indexOf('/item/') > 0)
      {
        $.showPage('page/_item.html', $.agorae.itempage.init);
        return false;
      }
    };

    this.rewrite = function(url){
      $.cookie('session', JSON.stringify($.agorae.config), { expires: 1/24/3});
      self.location.href = '?uri=' + url;
    };
  }

  function PageHelper(){
    function resizeSidebar(){
      var viewportHeight = window.innerHeight ? window.innerHeight : $(window).height();
		  viewportHeight = viewportHeight - 190;
		  viewportHeight = (viewportHeight > 0) ? viewportHeight : 0;
		  viewportHeight = (viewportHeight < $('div#main').outerHeight()) ? $('div#main').outerHeight() : viewportHeight;
		  $('div#sidebar').height(viewportHeight);
    };

    this.resize = function(){ resizeSidebar(); };

    this.init = function(){
      $(window).resize(resizeSidebar).trigger('resize');
      setTimeout('$.agorae.pagehelper.resize();', 300);
    };
    this.toggle = function(show){
      if(show)
        $('input#index-edit-toggle').iToggle({
      		easing: 'easeOutExpo',
      		type: 'radio',
      		keepLabel: true,
      		easing: 'easeInExpo',
      		speed: 300,
      		onClickOn: function(){
      			$('.ctl').show();
      			$('ul.links').addClass('editing').removeClass('links');
      		},
      		onClickOff: function(){
      		  $('.ctl').hide();
      		  $('ul.editing').addClass('links').removeClass('editing');
      		}
      	});
      else
        $('input#index-edit-toggle').hide();
    };

    this.checkController = function(){
      $.log($('#index-edit-toggle').attr('checked'));
      if($('#index-edit-toggle').attr('checked'))
        $('.ctl').show();
      else
        $('.ctl').hide();
    };

    this.navigatorBar = function(obj){
      if(typeof(obj) != 'string'){
        var str = '';
        for(var i=0, bar; bar = obj[i]; i++)
        {
          if(bar.uri)
            str += '<a href="' + bar.uri + '">' + bar.name + '</a>';
          else
            str += '<b>' + bar.name + '</b>';

          if(i < obj.length-1)
            str += ' &gt; ';
        }
        obj = str;
      }
      $('div#header-navigatorbar').html(obj);

    };
  }
  function FrontPage(){
    function loadItem(index, item){
      $.agorae.getItem(item, function(item){
        var el = $('<li><span>' + item.name + '</span></li>').attr("rel", item.id)
                  .data("item", item);
        $('ul#item').append(el);
      });
    }

    function loadViewpoint(index, viewpointUrl){
      $.agorae.getViewpoint(viewpointUrl, function(viewpoint){
        var server = viewpointUrl.substr(0, viewpointUrl.indexOf(viewpoint.id));
        var el = $('<li><span>' + viewpoint.name + '</span></li>')
                  .attr("rel", viewpoint.id).data("viewpoint", viewpoint)
                  .data("server", server).data('uri', viewpointUrl);
        $('ul#viewpoint').append(el);
      });
    }

    function apendViewpoint(viewpoint, server){
      server = server || $.agorae.config.servers[0];
      if(server.substr(-1) != "/") server += "/";
      $.log(server);
      var el = $('<li><img class="del ctl hide" '
                   + 'src="css/blitzer/images/delete.png"><span '
                   + 'class="editable">' + viewpoint.name + '</span></li>')
                   .attr("rel", viewpoint.id).data("viewpoint", viewpoint)
                   .data("server", server)
                   .data('uri', server + 'viewpoint/' + viewpoint.id);
      $('ul#viewpoint').append(el);
    }

    function loadUser(index, server){
      $.agorae.getUser(server, $.agorae.config.username, function(user){
        if(user.viewpoint)
          for(var i=0, viewpoint; viewpoint = user.viewpoint[i]; i++){
            apendViewpoint(viewpoint, server);
          }
      });
    }

    function onViewpointClick(el){
      if(!$('#index-edit-toggle').attr('checked'))
      {
        var uri = el.parent().data('uri');
        $.agorae.session.rewrite(uri);
        return false;
      }
      return true;
    }
    this.init = function(){
      $.each($.agorae.config.items, loadItem);
      $.each($.agorae.config.viewpoints, loadViewpoint);
      $.each($.agorae.config.servers, loadUser);
      $.agorae.pagehelper.toggle(true);
      $.agorae.pagehelper.navigatorBar('<b>Accueil</b>');
    	$('div.viewpoint-list img.add').live('click', function(){
        $.agorae.createViewpoint('no name', function(doc){
          apendViewpoint(doc);
          $.agorae.pagehelper.checkController();
        });
    	});

    	$('ul#viewpoint img.del').live('click', function(){
    	  var viewpoint = $(this).parent().data('viewpoint');
    	  var server = $(this).parent().data('server');
    	  var url = server + viewpoint.id;
    	  var self = $(this);
    	  $.agorae.deleteDoc(url, function(){
    	    self.parent().remove();
    	  });
    	});

      $('ul#viewpoint span.editable').live('click', function(){
        if(!onViewpointClick($(this)))
          return false;
        var viewpoint = $(this).parent().data('viewpoint');
    	  var server = $(this).parent().data('server');
        var viewpointName = $(this).text();
        var el = $('<input type="textbox">').val(viewpointName);
    	  $(this).replaceWith(el);
    	  el.focus(function() { $(this).select(); }).select()
    	    .mouseup(function(e){ e.preventDefault(); });
    	  el.blur(function(){
    	    var span = $('<span></span>').addClass('editable');
    	    if($(this).val() == '' || $(this).val() == viewpointName)
    	    {
    	      span.html(viewpointName);
    	      $(this).replaceWith(span);
    	    }
    	    else
    	    {
    	      var self = $(this);
    	      var newName = self.val();
        	  var url = server + viewpoint.id;
    	      $.agorae.renameViewpoint(url, newName, function(){
    	        span.html(newName);
    	        self.replaceWith(span);
    	      }, function(){
    	        span.html(viewpointName);
    	        self.replaceWith(span);
    	      });
    	    }
    	  });
    	  el.keyup(function(event){
          if (event.keyCode == 27 || event.keyCode == 13)
            $(this).blur();
        });
    	});

    	$('ul#viewpoint span').live('click', function(){ onViewpointClick($(this)); });
    }
  }

  function ViewpointPage(){

    function appendTopic(index, topic){
      var uri = $.queryString('uri');
      if(uri.substr(-1) == '/')
        uri = uri.substr(0,uri.length -1);

      uri += '/' + topic.id;
      uri = uri.replace(/\/viewpoint\//, "/topic/");
      var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                   + '<span class="editable">' + topic.name + '</span></li>')
                   .attr("rel", topic.id).attr("uri", uri);
      $('ul#topic').append(el);
    };

    function onTopicClick(el){
      if(!$('#index-edit-toggle').attr('checked'))
      {
        var uri = el.parent().attr('uri');
        $.agorae.session.rewrite(uri);
        return false;
      }
      return true;
    };

    this.init = function(){
      var uri = $.queryString('uri');
      $.agorae.getViewpoint(uri, function(viewpoint){
        var bars = [{'uri': './', 'name': 'Accueil'}];
        bars.push({'name': viewpoint.name + ''});
        $.agorae.pagehelper.navigatorBar(bars);
        if(viewpoint.upper)
          $.each(viewpoint.upper, appendTopic);
      });
      if(uri.indexOf($.agorae.config.servers[0]) == 0)
        $.agorae.pagehelper.toggle(true);
      else
        $.agorae.pagehelper.toggle(false);
      //Click to create topic with no name
      $('div.topic-list img.add').live('click', function(){
        $.agorae.createTopic(uri, 'no name', function(doc){
          appendTopic(0, doc);
          $.agorae.pagehelper.checkController();
        });
    	});

    	//Click to delete topic
    	$('div.topic-list img.del').live('click', function(){
        var id = $(this).parent().attr('rel');
    	  var self = $(this);
    	  $.agorae.deleteTopic(uri, id , function(){
    	    self.parent().remove();
    	  });
    	});

      //Click to edit in place
      $('ul#topic span.editable').live('click', function(){
        if(!onTopicClick($(this)))
          return false;
        var id = $(this).parent().attr('rel');
        var name = $(this).text();
        var el = $('<input type="textbox">').val(name);
    	  $(this).replaceWith(el);
    	  el.focus(function() { $(this).select(); }).select()
    	    .mouseup(function(e){ e.preventDefault(); });
    	  el.blur(function(){
    	    var span = $('<span></span>').addClass('editable');
    	    if($(this).val() == '' || $(this).val() == name)
    	    {
    	      span.html(name);
    	      $(this).replaceWith(span);
    	    }
    	    else
    	    {
    	      var self = $(this);
    	      var newName = self.val();
    	      $.agorae.renameTopic(uri, id, newName, function(){
    	        span.html(newName);
    	        self.replaceWith(span);
    	      }, function(){
    	        span.html(name);
    	        self.replaceWith(span);
    	      });
    	    }
    	  });
    	  el.keyup(function(event){
          if (event.keyCode == 27 || event.keyCode == 13)
            $(this).blur();
        });
    	});

      //Click on non-editable link
    	$('ul#topic span').live('click', function(){ onTopicClick($(this)); return false; });
    };
  }

  function TopicPage(){
    this.init = function(){
      var uri = $.queryString('uri');

      $.agorae.getTopic(uri, function(topic){
        var bars = [{'uri': './', 'name': 'Accueil'}];
        bars.push({'uri': './?uri=' + topic.prefixUrl + 'viewpoint/' + topic.viewpoint_id, 'name': topic.viewpoint_name});
        if(topic.broader)
          for(var i=0, t; t = topic.broader[i]; i++)
            bars.push({'uri': './?uri=' + topic.prefixUrl + 'topic/' + topic.viewpoint_id + '/' + t.id, 'name': t.name});
        bars.push({'name': topic.name});
        $.agorae.pagehelper.navigatorBar(bars);
        if(topic.narrower)
          $.each(topic.narrower, appendTopic);
        if(topic.item)
          $.each(topic.item, appendItem);
      });

      if(uri.indexOf($.agorae.config.servers[0]) == 0)
        $.agorae.pagehelper.toggle(true);
      else
        $.agorae.pagehelper.toggle(false);

      //Click to create topic with no name
      $('div.topic-list img.add').click(function(event){
        event.stopPropagation();
        $.agorae.createTopic(uri, 'no name', function(topic){
          if(uri.substr(-1) == '/')
            uri = uri.substr(0,uri.length -1);
          var parts = uri.split('/');
          parts.pop();
          parts.push(topic.id);
          topic.uri = parts.join('/');
          appendTopic(0, topic);
          $.agorae.pagehelper.checkController();
        });
        return false;
    	});

    	//Click to delete topic
    	$('div.topic-list img.del').live('click', function(event){
    	  event.stopPropagation();
        var id = $(this).parent().attr('rel');
    	  var self = $(this);
    	  $.agorae.deleteTopic(uri, id , function(){
    	    self.parent().remove();
    	  });
    	  return false;
    	});

      //Click to unlink topic
    	$('div.topic-list img.unlink').live('click', function(event){
    	  event.stopPropagation();
        var id = $(this).parent().attr('rel');
    	  var self = $(this);
    	  $.agorae.unlinkTopic(uri, id , function(){
    	    self.parent().remove();
    	  });
    	  return false;
    	});

    	//Click to edit in place
      $('ul#topic span.editable').live('click', function(event){
        event.stopPropagation();
        if(!onTopicClick($(this)))
          return false;
        var id = $(this).parent().attr('rel');
        var name = $(this).text();
        var el = $('<input type="textbox">').val(name);
    	  $(this).replaceWith(el);
    	  el.focus(function() { $(this).select(); }).select()
    	    .mouseup(function(e){ e.preventDefault(); });
    	  el.blur(function(){
    	    var span = $('<span></span>').addClass('editable');
    	    if($(this).val() == '' || $(this).val() == name)
    	    {
    	      span.html(name);
    	      $(this).replaceWith(span);
    	    }
    	    else
    	    {
    	      var self = $(this);
    	      var newName = self.val();
    	      $.agorae.renameTopic(uri, id, newName, function(){
    	        span.html(newName);
    	        self.replaceWith(span);
    	      }, function(){
    	        span.html(name);
    	        self.replaceWith(span);
    	      });
    	    }
    	  });
    	  el.keyup(function(event){
          if (event.keyCode == 27 || event.keyCode == 13)
            $(this).blur();
        });
        return false;
    	});

    	//Click to create item with no name
      $('div.item-list img.add').click(function(event){
        $.log('start to create item');
        event.stopPropagation();
        $.agorae.createItem(uri, 'no name', function(item){
          $.log('create item');
          $.log(item);
          appendItem(0, item);
          $.log('create done');
          $.agorae.pagehelper.checkController();
          return false;
        });
        $.log('end to create item');
        return false;
    	});
    	//Click to unlink item
    	$('div.item-list img.unlink').live('click', function(event){
    	  event.stopPropagation();
        var itemID = $(this).parent().attr('rel');
    	  var self = $(this);
    	  $.agorae.unlinkItem(uri, itemID , function(){
    	    self.parent().remove();
    	  });
    	  return false;
    	});
    	//Click to delete item
    	$('div.item-list img.del').live('click', function(event){
    	  event.stopPropagation();
        var itemID = $(this).parent().attr('rel');
    	  var self = $(this);
    	  var prefixUrl;
        if(uri.substr(-1) == '/')
          uri = uri.substr(0,uri.length -1);
        if(uri.indexOf("/topic/") > 0)
          prefixUrl = uri.substr(0, uri.indexOf("topic/"));
    	  $.agorae.deleteDoc(prefixUrl + itemID , function(){
    	    self.parent().remove();
    	  });
    	  return false;
    	});
    	//Click to edit in place
      $('ul#item span.editable').live('click', function(event){
        event.stopPropagation();
        if(!onItemClick($(this)))
          return false;
        var id = $(this).parent().attr('rel');
        var name = $(this).text();
        var el = $('<input type="textbox">').val(name);
    	  $(this).replaceWith(el);
    	  el.focus(function() { $(this).select(); }).select()
    	    .mouseup(function(e){ e.preventDefault(); });
    	  el.blur(function(){
    	    var span = $('<span></span>').addClass('editable');
    	    if($(this).val() == '' || $(this).val() == name)
    	    {
    	      span.html(name);
    	      $(this).replaceWith(span);
    	    }
    	    else
    	    {
    	      var self = $(this);
    	      var newName = self.val();
    	      var prefixUrl;
            if(uri.substr(-1) == '/')
              uri = uri.substr(0,uri.length -1);
            if(uri.indexOf("/topic/") > 0)
              prefixUrl = uri.substr(0, uri.indexOf("topic/"));
    	      $.agorae.renameItem(prefixUrl, id, newName, function(){
    	        span.html(newName);
    	        self.replaceWith(span);
    	      }, function(){
    	        span.html(name);
    	        self.replaceWith(span);
    	      });
    	    }
    	  });
    	  el.keyup(function(event){
          if (event.keyCode == 27 || event.keyCode == 13)
            $(this).blur();
        });
    	});
    };

    function appendTopic(idx, topic){
      var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                   + '<img class="unlink ctl hide" src="css/blitzer/images/unlink.png">'
                   + '<span class="editable">' + topic.name + '</span></li>')
                   .attr("rel", topic.id).attr("uri", topic.uri);
      $('ul#topic').append(el);
    };

    function appendItem(idx, item){
      var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                   + '<img class="unlink ctl hide" src="css/blitzer/images/unlink.png">'
                   + '<span class="editable">' + item.name + '</span></li>')
                   .attr("rel", item.id).attr("corpus", item.corpus);
      $('ul#item').append(el);
    };

    function onTopicClick(el){
      if(!$('#index-edit-toggle').attr('checked'))
      {
        var uri = el.parent().attr('uri');
        $.agorae.session.rewrite(uri);
        return false;
      }
      return true;
    };

    function onItemClick(el){
      var prefixUrl;
      var uri = $.queryString('uri');
      if(uri.substr(-1) == '/')
        uri = uri.substr(0,uri.length -1);
      if(uri.indexOf("/topic/") > 0)
        prefixUrl = uri.substr(0, uri.indexOf("topic/"));
      if(!$('#index-edit-toggle').attr('checked'))
      {
        var corpusID = el.parent().attr('corpus');
        var itemId = el.parent().attr('rel');

        var uri = prefixUrl + 'item/' + corpusID + '/' + itemId;
        $.agorae.getItem(uri, function(){
          $.agorae.session.rewrite(uri);
        }, function(){
          //TODO check every server to find item
          for(var i=0, server; server = $.agorae.config.servers[i]; i++)
          {
            if(server == prefixUrl) continue;
            uri = server + 'item/' + corpusID + '/' + itemId;
            $.agorae.getItem(uri, function(){
                $.agorae.session.rewrite(uri);
              }, function(){ return false; });
          }
        });
        return false;
      }
      return true;
    };
  }

  function ItemPage(){
    this.init = function(){
      var uri = $.queryString('uri');
      $.agorae.getItem(uri, function(item){
        $.log(item);
        var bars = [{'uri': './', 'name': 'Accueil'}];
        bars.push({'name': item.name + ''});
        $.agorae.pagehelper.navigatorBar(bars);
        var reserved = ["corpus", "id", "highlight", "name", "resource", "topic"];
        for(var n in item){
          if(reserved.indexOf(n) >= 0) continue;
          appendAttribute(n, item[n]);
        }
        if(item.resource)
          $.each(item.resource, appendResource);
      });

      if(uri.indexOf($.agorae.config.servers[0]) == 0)
        $.agorae.pagehelper.toggle(true);
      else
        $.agorae.pagehelper.toggle(false);
    };

    function appendAttribute(name, value){
      value = (typeof(value[0]) == "string") ? value : value[0];
      var str = '<div class="attribute">';
      str += '<div style="display: inline;" class="attributename">' + name + '</div>';
      str += '<div style="display: inline;" class="attributevalue">';
      for(var i=0, v; v = value[i]; i++)
      {
        var comma = (i < value.length - 1) ? "," : "";
        str += '<span>' + v + comma + '</span>';
      }
      str += '</div></div>';

      $('div.attributes').append(str);
    };

    function appendResource(idx, url){
      var urlPath = $.url.setUrl(url).attr("path");
      var file = urlPath;
      if(urlPath.indexOf("/") >= 0)
      {
        var parts = urlPath.split("/");
        file = parts.pop();
        if(file == "") file = parts.pop();
      }
      var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                   + '<span class="editable">' + file + '</span></li>')
                   .attr("rel", url);
      $('ul#resource').append(el);
    };
  }
  $.agorae = $.agorae || {};
  $.extend($.agorae, {
    session : new Session(),
    pagehelper : new PageHelper(),
    frontpage : new FrontPage(),
    viewpointpage : new ViewpointPage(),
    topicpage : new TopicPage(),
    itempage : new ItemPage()
  });
})(jQuery);