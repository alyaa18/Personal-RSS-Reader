using System.Xml.Linq;
using PersonalRSSReader.Api.Models;
using PersonalRSSReader.Api.Models.DTOs;

namespace PersonalRSSReader.Api.Services;

public class RssFeedGeneratorService
{
    public string GeneratePlaylistFeed(Playlist playlist, List<ArticleWithFeedInfo> articles, string baseUrl)
    {
        var channel = new XElement("channel",
            new XElement("title", $"{playlist.Name} — Personal RSS Reader Playlist"),
            new XElement("description", $"A curated playlist: {playlist.Name}"),
            new XElement("link", $"{baseUrl}/playlists/{playlist.Slug}"),
            new XElement("lastBuildDate", DateTime.UtcNow.ToString("r")),
            articles.Select(a => new XElement("item",
                new XElement("title", a.Title),
                new XElement("link", a.Link),
                new XElement("guid", a.Link),
                new XElement("description", a.Summary),
                new XElement("source", new XAttribute("url", a.FeedUrl), a.FeedTitle),
                string.IsNullOrWhiteSpace(a.Author) ? null : new XElement("author", a.Author),
                new XElement("pubDate", a.PublishedAt.ToString("r"))
            ))
        );

        var doc = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement("rss", new XAttribute("version", "2.0"), channel)
        );

        return doc.Declaration + Environment.NewLine + doc.ToString();
    }
}