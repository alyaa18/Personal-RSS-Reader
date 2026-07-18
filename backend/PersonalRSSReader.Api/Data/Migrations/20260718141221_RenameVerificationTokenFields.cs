using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalRSSReader.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameVerificationTokenFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "VerificationToken",
                table: "Users",
                newName: "EmailVerificationToken");

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailVerificationTokenExpiresAt",
                table: "Users",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmailVerificationTokenExpiresAt",
                table: "Users");

            migrationBuilder.RenameColumn(
                name: "EmailVerificationToken",
                table: "Users",
                newName: "VerificationToken");
        }
    }
}
