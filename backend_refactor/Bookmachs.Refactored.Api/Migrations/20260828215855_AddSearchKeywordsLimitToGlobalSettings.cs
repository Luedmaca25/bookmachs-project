using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Refactored.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSearchKeywordsLimitToGlobalSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SearchKeywordsLimitPremium",
                table: "GlobalSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SearchKeywordsLimitPremium",
                table: "GlobalSettings");
        }
    }
}
