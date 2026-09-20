using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Refactored.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIsSubscriptionCancelledToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSubscriptionCancelled",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSubscriptionCancelled",
                table: "Users");
        }
    }
}
