using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Refactored.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddShippingAndPostSaleToMatchTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "BuyOrder",
                table: "MatchTransactions",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(26)",
                oldMaxLength: 26,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdminNotes",
                table: "MatchTransactions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CourierName",
                table: "MatchTransactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostSaleNotes",
                table: "MatchTransactions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostSaleStatus",
                table: "MatchTransactions",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress",
                table: "MatchTransactions",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingCity",
                table: "MatchTransactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingRegion",
                table: "MatchTransactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrackingNumber",
                table: "MatchTransactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminNotes",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "CourierName",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "PostSaleNotes",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "PostSaleStatus",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "ShippingAddress",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "ShippingCity",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "ShippingRegion",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "TrackingNumber",
                table: "MatchTransactions");

            migrationBuilder.AlterColumn<string>(
                name: "BuyOrder",
                table: "MatchTransactions",
                type: "nvarchar(26)",
                maxLength: 26,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);
        }
    }
}
