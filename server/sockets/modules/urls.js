module.exports = function(handler, vars, io, db_manager, config, sconfig, utilz, logger)
{
    // Checks if a domain is black or white listed
    handler.check_domain_list = function(media_type, src)
    {
        try
        {
            let list_type = config[`${media_type}_domain_white_or_black_list`]

            if(list_type !== "white" && list_type !== "black")
            {
                return false
            }

            let list = config[`${media_type}_domain_list`]

            if(list.length === 0)
            {
                return false
            }

            let domain = utilz.get_root(src)
            let includes = list.includes(domain) || list.includes(`${domain}/`)

            if(list_type === "white")
            {
                if(!includes)
                {
                    return true
                }
            }

            else if(list_type === "black")
            {
                if(includes)
                {
                    return true
                }
            }

            return false
        }

        catch(err)
        {
            logger.log_error(err)
        }
    }

    // Checks if link data is available on Redis or tries to fetch metadata
    handler.process_message_links = function(message, callback)
    {
        let url = utilz.get_first_url(message)

        if(!url)
        {
            return callback({})
        }

        if(url.includes('"') || url.includes("'") || url.includes("*"))
        {
            return callback({})
        }

        if(vars.redis_client_ready)
        {
            vars.redis_client.hgetall(`hue_link_${url}`, function(err, reply)
            {
                if(err)
                {
                    return callback({})
                }

                if(reply)
                {
                    if(Date.now() - reply.date > config.redis_max_link_age)
                    {
                        return handler.get_link_metadata(url, callback)
                    }

                    else
                    {
                        return callback(reply)
                    }
                }

                else
                {
                    return handler.get_link_metadata(url, callback)
                }
            })
        }

        else
        {
            return handler.get_link_metadata(url, callback)
        }
    }

    // Tries to fetch a site's metadata
    handler.get_link_metadata = function(url, callback)
    {
        let response =
        {
            title: "",
            image: "",
            url: url
        }

        if(!utilz.is_url(url))
        {
            return callback(response)
        }

        if(url === "http://localhost" || url === "https://localhost")
        {
            return callback(response)
        }

        let extension = utilz.get_extension(url).toLowerCase()

        if(extension)
        {
            if(extension !== "html" && extension !== "php")
            {
                return callback(response)
            }
        }

        vars.fetch(url,
        {
            timeout: config.link_fetch_timeout
        })

        .then(res =>
        {
            return res.text()
        })

        .then(body =>
        {
            let $ = vars.cheerio.load(body)
            let title = ""

            if($("title").length > 0)
            {
                title = utilz.clean_string2($("title").eq(0).text().substring(0, config.link_max_title_length)) || ""
            }

            else if($('meta[property="og:title"]').length > 0)
            {
                title = utilz.clean_string2($('meta[property="og:title"]').eq(0).attr('content').substring(0, config.link_max_title_length)) || ""
            }

            response.title = title

            response.image = $('meta[property="og:image"]').attr('content') || ""

            if(response.image.length > config.safe_limit_3)
            {
                response.image = ""
            }

            if(vars.redis_client_ready)
            {
                vars.redis_client.hmset
                (
                    `hue_link_${url}`,
                    "title", response.title,
                    "image", response.image,
                    "url", response.url,
                    "date", Date.now()
                )
            }

            return callback(response)
        })

        .catch(err =>
        {
            if(vars.redis_client_ready)
            {
                vars.redis_client.hmset
                (
                    `hue_link_${url}`,
                    "title", response.title,
                    "image", response.image,
                    "url", response.url,
                    "date", Date.now()
                )
            }

            return callback(response)
        })
    }
}