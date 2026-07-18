using System.Xml.Linq;
using PersonalRSSReader.Api.Models;
using PersonalRSSReader.Api.Models.DTOs;

namespace PersonalRSSReader.Api.Services;

public class RssFeedGeneratorService
{
    // Media RSS namespace for images and thumbnails
    private static readonly XNamespace Media = "http://search.yahoo.com/mrss/";

    public string GeneratePlaylistFeed(Playlist playlist, List<ArticleWithFeedInfo> articles, string baseUrl)
    {
        var channel = new XElement("channel",
            new XElement("title", $"{playlist.Name} — Personal RSS Reader Playlist"),
            new XElement("description", $"A curated playlist: {playlist.Name}"),
            new XElement("link", $"{baseUrl}/playlists/{playlist.Slug}"),
            new XElement("lastBuildDate", DateTime.UtcNow.ToString("r")),
            articles.Select(a => BuildItemElement(a))
        );

        var doc = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement("rss",
                new XAttribute("version", "2.0"),
                new XAttribute(XNamespace.Xmlns + "media", Media.NamespaceName),
                channel)
        );

        return doc.Declaration + Environment.NewLine + doc.ToString();
    }

    private static XElement BuildItemElement(ArticleWithFeedInfo a)
    {
        var item = new XElement("item",
            new XElement("title", a.Title),
            new XElement("link", a.Link),
            new XElement("guid", a.Link),
            new XElement("description", a.Summary),
            new XElement("source", new XAttribute("url", a.FeedUrl), a.FeedTitle),
            string.IsNullOrWhiteSpace(a.Author) ? null : new XElement("author", a.Author),
            new XElement("pubDate", a.PublishedAt.ToString("r"))
        );

        // Include image as Media RSS elements (matches BBC's format — widely supported)
        if (!string.IsNullOrWhiteSpace(a.ImageUrl))
        {
            // <media:thumbnail> — standard thumbnail element (no medium attribute)
            item.Add(new XElement(Media + "thumbnail",
                new XAttribute("url", a.ImageUrl)));

            // <media:content medium="image"> — alternate form some readers prefer
            item.Add(new XElement(Media + "content",
                new XAttribute("url", a.ImageUrl),
                new XAttribute("medium", "image")));
        }

        // Include audio/video enclosures (e.g. podcast episodes)
        if (!string.IsNullOrWhiteSpace(a.EnclosureUrl) && !string.IsNullOrWhiteSpace(a.EnclosureType))
        {
            item.Add(new XElement("enclosure",
                new XAttribute("url", a.EnclosureUrl),
                new XAttribute("type", a.EnclosureType)));
        }

        return item;
    }
}