using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTimelineReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReviewComment",
                table: "TimelineEvents",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReviewRating",
                table: "TimelineEvents",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReviewComment",
                table: "TimelineEvents");

            migrationBuilder.DropColumn(
                name: "ReviewRating",
                table: "TimelineEvents");
        }
    }
}
