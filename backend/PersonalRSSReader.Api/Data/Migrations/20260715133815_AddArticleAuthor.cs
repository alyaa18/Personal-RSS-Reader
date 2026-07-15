using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalRSSReader.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddArticleAuthor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Author",
                table: "Articles",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Author",
                table: "Articles");
        }
    }
}
